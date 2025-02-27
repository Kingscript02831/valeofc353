
import { useState } from "react";
import { ChatList } from "@/components/chat/ChatList";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { toast } from "sonner";

const ChatHome = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado para buscar usuários");
        navigate("/login");
        return;
      }
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, full_name")
        .or(`username.ilike.%${query}%, full_name.ilike.%${query}%`)
        .neq('id', session.user.id)
        .limit(5);

      if (error) {
        console.error("Erro na busca:", error);
        toast.error("Erro ao buscar usuários");
        return;
      }

      console.log("Resultados da busca:", data?.length || 0);
      setSearchResults(data || []);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      toast.error("Erro ao buscar usuários");
    } finally {
      setIsSearching(false);
    }
  };

  const startNewChat = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado para iniciar um chat");
        navigate("/login");
        return;
      }
      
      console.log("Iniciando chat com usuário:", userId);
      
      // Criamos o ID da sala de chat ordenando os IDs dos usuários
      const chatId = [session.user.id, userId].sort().join('_');
      
      // Verificar se o chat existe, se não, criá-lo
      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .eq('id', chatId)
        .maybeSingle();
        
      if (!existingChat) {
        console.log("Chat não encontrado, criando novo chat");
        // Criar o chat
        const { error: createChatError } = await supabase
          .from('chats')
          .insert({ id: chatId });
          
        if (createChatError) {
          console.error("Erro ao criar chat:", createChatError);
          throw createChatError;
        }
        
        // Adicionar participantes
        const { error: participantsError } = await supabase
          .from('chat_participants')
          .insert([
            { chat_id: chatId, user_id: session.user.id },
            { chat_id: chatId, user_id: userId }
          ]);
          
        if (participantsError) {
          console.error("Erro ao adicionar participantes:", participantsError);
          throw participantsError;
        }
      }
      
      // Navegar para a página de chat
      navigate(`/chat/${userId}`);
      
    } catch (error) {
      console.error("Erro ao iniciar chat:", error);
      toast.error("Não foi possível iniciar o chat");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      <div className="bg-[#075E54] text-white p-4 shadow-md">
        <h1 className="text-xl font-semibold mb-2">Mensagens</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar usuário para iniciar conversa..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 bg-[#128C7E] text-white placeholder:text-gray-200 border-none rounded-lg"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>
      </div>
      
      {searchResults.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow-md z-10">
          {searchResults.map((user) => (
            <div 
              key={user.id}
              className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              onClick={() => startNewChat(user.id)}
            >
              <div className="flex items-center">
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback>
                    {user.username?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{user.username}</p>
                  {user.full_name && (
                    <p className="text-sm text-gray-500">{user.full_name}</p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                className="text-[#075E54]"
                onClick={(e) => {
                  e.stopPropagation();
                  startNewChat(user.id);
                }}
              >
                Conversar
              </Button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex-1 overflow-auto">
        <ChatList />
      </div>
    </div>
  );
};

export default ChatHome;
