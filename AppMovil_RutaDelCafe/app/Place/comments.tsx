// app/Place/comments.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Comment {
  id: number;
  user_id: number;
  place_id: number;
  comment: string;
  date: string;
  createdBy: number;
  createdAt: string;
  user_name: string;
  user_email: string;
}

export default function CommentsScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const placeId = Number(id);

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<number>(0);
  
  // Estados para edición
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editText, setEditText] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    loadUser();
    fetchComments();
  }, []);

  const loadUser = async () => {
    try {
      const raw = await AsyncStorage.getItem('userData');
      if (raw) {
        const user = JSON.parse(raw);
        setUserId(user.id || 0);
      }
    } catch {
      setUserId(0);
    }
  };

  const fetchComments = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/comments/place/${placeId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setComments(data.data || []);
      } else {
        throw new Error('Error al cargar los comentarios');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los comentarios');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchComments();
  };

  const submitComment = async () => {
    if (!newComment.trim()) {
      Alert.alert('Error', 'El comentario no puede estar vacío');
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/comments`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            place_id: placeId,
            comment: newComment.trim(),
          }),
        }
      );

      if (response.ok) {
        setNewComment('');
        fetchComments(); // Recargar comentarios
      } else {
        throw new Error('Error al enviar el comentario');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar el comentario');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const startEditComment = (comment: Comment) => {
    setEditingComment(comment);
    setEditText(comment.comment);
    setEditModalVisible(true);
  };

  const submitEditComment = async () => {
    if (!editText.trim() || !editingComment) {
      Alert.alert('Error', 'El comentario no puede estar vacío');
      return;
    }

    setEditing(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/comments/${editingComment.id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            comment: editText.trim(),
          }),
        }
      );

      if (response.ok) {
        setEditModalVisible(false);
        setEditingComment(null);
        setEditText('');
        fetchComments(); // Recargar comentarios
        Alert.alert('Éxito', 'Comentario actualizado correctamente');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar el comentario');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el comentario');
      console.error(error);
    } finally {
      setEditing(false);
    }
  };

  const deleteComment = async (commentId: number) => {
    Alert.alert(
      'Eliminar comentario',
      '¿Estás seguro de que quieres eliminar este comentario?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const response = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL}/api/comments/${commentId}`,
                {
                  method: 'DELETE',
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              if (response.ok) {
                fetchComments(); // Recargar comentarios
                Alert.alert('Éxito', 'Comentario eliminado correctamente');
              } else {
                throw new Error('Error al eliminar el comentario');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el comentario');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-orange-50">
        <ActivityIndicator size="large" color="#f97316" />
        <Text className="text-orange-700 mt-4">Cargando comentarios...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-orange-50">
      {/* Header */}
      <View className="bg-orange-500 px-6 py-4 rounded-b-3xl shadow-lg">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-white text-xl font-bold text-center">
              Comentarios
            </Text>
            <Text className="text-orange-100 text-sm mt-1 text-center" numberOfLines={1}>
              {name || 'Lugar'}
            </Text>
          </View>
        </View>
      </View>

      {/* Botón de volver */}
      <View className="px-6 mt-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-orange-100 border border-orange-400 py-3 rounded-xl shadow flex-row items-center justify-center"
        >
          <Ionicons name="arrow-back" size={22} color="#f97316" />
          <Text className="text-orange-700 font-semibold text-base ml-2">Volver</Text>
        </TouchableOpacity>
      </View>

      {/* Formulario de comentario */}
      <View className="p-4 bg-white mx-4 mt-4 rounded-2xl border border-orange-200 shadow-sm">
        <TextInput
          value={newComment}
          onChangeText={setNewComment}
          placeholder="Escribe tu comentario..."
          multiline
          numberOfLines={3}
          className="bg-orange-50 rounded-xl p-4 border border-orange-200 text-orange-900"
          placeholderTextColor="#9ca3af"
        />
        <TouchableOpacity
          onPress={submitComment}
          disabled={submitting || !newComment.trim()}
          className={`py-3 rounded-xl mt-3 flex-row items-center justify-center ${
            submitting || !newComment.trim() ? 'bg-orange-300' : 'bg-orange-500'
          }`}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="send-outline" size={20} color="white" />
              <Text className="text-white font-semibold text-lg ml-2">
                Enviar Comentario
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Lista de comentarios */}
      <View className="flex-1 mt-4">
        <Text className="text-orange-800 text-lg font-bold px-4 mb-3">
          Comentarios ({comments.length})
        </Text>

        <FlatList
          data={comments}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-4 pb-4"
          renderItem={({ item }) => (
            <View className="bg-white rounded-2xl p-4 mb-3 border border-orange-200 shadow-sm">
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1">
                  <Text className="text-orange-900 font-bold text-base">
                    {item.user_name || 'Usuario'}
                  </Text>
                  <Text className="text-orange-600 text-xs">
                    {formatDate(item.createdAt)}
                    {item.createdAt !== item.date && ' • Editado'}
                  </Text>
                </View>
                
                {/* Botones de acción - solo para el propietario del comentario */}
                {item.user_id === userId && (
                  <View className="flex-row">
                    <TouchableOpacity
                      onPress={() => startEditComment(item)}
                      className="p-1 mr-2"
                    >
                      <Ionicons name="create-outline" size={18} color="#3b82f6" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteComment(item.id)}
                      className="p-1"
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              <Text className="text-orange-800 text-sm leading-5">
                {item.comment}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View className="bg-white rounded-2xl p-8 items-center justify-center border border-orange-200">
              <Ionicons name="chatbubble-outline" size={48} color="#ea580c" />
              <Text className="text-orange-800 text-lg font-semibold mt-4 text-center">
                No hay comentarios aún
              </Text>
              <Text className="text-orange-600 text-center mt-2">
                Sé el primero en comentar sobre este lugar
              </Text>
            </View>
          }
        />
      </View>

      {/* Modal de edición */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl p-6 mx-4 w-11/12 max-w-md">
            <Text className="text-orange-900 text-xl font-bold mb-4">
              Editar Comentario
            </Text>
            
            <TextInput
              value={editText}
              onChangeText={setEditText}
              placeholder="Edita tu comentario..."
              multiline
              numberOfLines={4}
              className="bg-orange-50 rounded-xl p-4 border border-orange-200 text-orange-900 mb-4"
              placeholderTextColor="#9ca3af"
            />
            
            <View className="flex-row justify-between gap-3">
              <TouchableOpacity
                onPress={() => {
                  setEditModalVisible(false);
                  setEditingComment(null);
                  setEditText('');
                }}
                className="flex-1 bg-gray-200 py-3 rounded-xl flex-row items-center justify-center"
              >
                <Text className="text-gray-700 font-semibold">Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={submitEditComment}
                disabled={editing || !editText.trim()}
                className={`flex-1 py-3 rounded-xl flex-row items-center justify-center ${
                  editing || !editText.trim() ? 'bg-orange-300' : 'bg-orange-500'
                }`}
              >
                {editing ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-semibold">Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}