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
import { useThemedStyles } from '../../hooks/useThemedStyles';

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
  const themed = useThemedStyles(); // 🎨 tema
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const placeId = Number(id);

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // sesión/usuario
  const [isLogged, setIsLogged] = useState(false);
  const [userId, setUserId] = useState<number>(0);

  // crear comentario
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // edición
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
      const token = await AsyncStorage.getItem('userToken');
      setIsLogged(!!token);
      const raw = await AsyncStorage.getItem('userData');
      if (raw) {
        const user = JSON.parse(raw);
        setUserId(user.id || 0);
      } else {
        setUserId(0);
      }
    } catch {
      setIsLogged(false);
      setUserId(0);
    }
  };

  // 🔓 GET público (token opcional)
  const fetchComments = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const headers: any = { 'Content-Type': 'application/json', Accept: 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/comments/place/${placeId}`,
        { headers }
      );

      if (res.ok) {
        const data = await res.json();
        setComments(data.data || []);
      } else {
        throw new Error('Error al cargar los comentarios');
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudieron cargar los comentarios');
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchComments();
  };

  // 📨 Crear comentario (solo logueado)
  const submitComment = async () => {
    if (!newComment.trim()) {
      Alert.alert('Error', 'El comentario no puede estar vacío');
      return;
    }
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para comentar.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/comments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ place_id: placeId, comment: newComment.trim() }),
      });

      if (response.ok) {
        setNewComment('');
        fetchComments();
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

  // ✏️ Editar (solo autor + logueado)
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
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para editar comentarios.');
      return;
    }

    setEditing(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/comments/${editingComment.id}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment: editText.trim() }),
        }
      );

      if (response.ok) {
        setEditModalVisible(false);
        setEditingComment(null);
        setEditText('');
        fetchComments();
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

  // 🗑️ Eliminar (solo autor + logueado)
  const deleteComment = async (commentId: number) => {
    Alert.alert('Eliminar comentario', '¿Estás seguro de que quieres eliminar este comentario?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
              Alert.alert('Inicia sesión', 'Debes iniciar sesión para eliminar comentarios.');
              return;
            }
            const response = await fetch(
              `${process.env.EXPO_PUBLIC_API_URL}/api/comments/${commentId}`,
              { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.ok) {
              fetchComments();
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
    ]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themed.background }}>
        <ActivityIndicator size="large" color={themed.accent as string} />
        <Text style={{ color: themed.muted as string, marginTop: 16 }}>Cargando comentarios...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: themed.background }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: themed.accent,
          paddingHorizontal: 24,
          paddingVertical: 16,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', textAlign: 'center' }}>Comentarios</Text>
            <Text
              style={{ color: '#FFFFFF', opacity: 0.9, fontSize: 12, marginTop: 4, textAlign: 'center' }}
              numberOfLines={1}
            >
              {name || 'Lugar'}
            </Text>
          </View>
        </View>
      </View>

      {/* Volver */}
      <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            backgroundColor: themed.isDark ? '#0b1220' : '#fff7ed',
            borderWidth: 1,
            borderColor: themed.accent,
            paddingVertical: 12,
            borderRadius: 12,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
          }}
        >
          <Ionicons name="arrow-back" size={22} color={themed.accent as string} />
          <Text style={{ color: themed.accent as string, fontWeight: '600', fontSize: 16, marginLeft: 8 }}>Volver</Text>
        </TouchableOpacity>
      </View>

      {/* Crear comentario (solo logueado) */}
      {isLogged ? (
        <View
          style={{
            padding: 16,
            backgroundColor: themed.card,
            marginHorizontal: 16,
            marginTop: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: themed.border,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
          }}
        >
          <TextInput
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Escribe tu comentario..."
            multiline
            numberOfLines={3}
            placeholderTextColor={themed.muted as string}
            style={{
              backgroundColor: themed.isDark ? '#0B1220' : '#FFFFFF',
              borderWidth: 1,
              borderColor: themed.border,
              color: themed.text,
              borderRadius: 12,
              padding: 12,
              minHeight: 90,
            }}
          />
          <TouchableOpacity
            onPress={submitComment}
            disabled={submitting || !newComment.trim()}
            style={{
              paddingVertical: 12,
              borderRadius: 12,
              marginTop: 12,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              backgroundColor: submitting || !newComment.trim() ? (themed.isDark ? '#5b5b5b' : '#fed7aa') : (themed.accent as string),
            }}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="send-outline" size={20} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16, marginLeft: 8 }}>
                  Enviar Comentario
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={{
            padding: 16,
            backgroundColor: themed.card,
            marginHorizontal: 16,
            marginTop: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: themed.border,
          }}
        >
          <Text style={{ color: themed.text }}>Inicia sesión para escribir un comentario.</Text>
          <TouchableOpacity
            onPress={() => router.push('/login')}
            style={{
              backgroundColor: themed.accent,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 12,
              marginTop: 12,
              alignSelf: 'flex-start',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Iniciar sesión</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Lista */}
      <View style={{ flex: 1, marginTop: 16 }}>
        <Text style={{ color: themed.text, fontSize: 18, fontWeight: '800', paddingHorizontal: 16, marginBottom: 12 }}>
          Comentarios ({comments.length})
        </Text>

        <FlatList
          data={comments}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themed.accent as string} />}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: themed.card,
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: themed.border,
                shadowColor: '#000',
                shadowOpacity: 0.05,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ color: themed.text, fontWeight: '800', fontSize: 16 }}>
                    {item.user_name || 'Usuario'}
                  </Text>
                  <Text style={{ color: themed.muted as string, fontSize: 12, marginTop: 2 }}>
                    {formatDate(item.createdAt)}
                    {item.createdAt !== item.date && ' • Editado'}
                  </Text>
                </View>

                {/* Acciones: solo autor + logueado */}
                {isLogged && item.user_id === userId && (
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity onPress={() => startEditComment(item)} style={{ padding: 4, marginRight: 8 }}>
                      <Ionicons name="create-outline" size={18} color={themed.isDark ? '#60a5fa' : '#3b82f6'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteComment(item.id)} style={{ padding: 4 }}>
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <Text style={{ color: themed.text, fontSize: 14, lineHeight: 20 }}>{item.comment}</Text>
            </View>
          )}
          ListEmptyComponent={
            <View
              style={{
                backgroundColor: themed.card,
                borderRadius: 16,
                padding: 24,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: themed.border,
              }}
            >
              <Ionicons name="chatbubble-outline" size={48} color={themed.accent as string} />
              <Text style={{ color: themed.text, fontSize: 18, fontWeight: '800', marginTop: 12, textAlign: 'center' }}>
                No hay comentarios aún
              </Text>
              <Text style={{ color: themed.muted as string, textAlign: 'center', marginTop: 8 }}>
                {isLogged ? 'Sé el primero en comentar sobre este lugar' : 'Inicia sesión para comentar'}
              </Text>
            </View>
          }
        />
      </View>

      {/* Modal edición */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View
            style={{
              backgroundColor: themed.card,
              borderRadius: 16,
              padding: 20,
              marginHorizontal: 16,
              width: '92%',
              maxWidth: 480,
              borderWidth: 1,
              borderColor: themed.border,
            }}
          >
            <Text style={{ color: themed.text, fontSize: 20, fontWeight: '800', marginBottom: 12 }}>
              Editar Comentario
            </Text>

            <TextInput
              value={editText}
              onChangeText={setEditText}
              placeholder="Edita tu comentario..."
              multiline
              numberOfLines={4}
              placeholderTextColor={themed.muted as string}
              style={{
                backgroundColor: themed.isDark ? '#0B1220' : '#FFFFFF',
                borderWidth: 1,
                borderColor: themed.border,
                color: themed.text,
                borderRadius: 12,
                padding: 12,
                minHeight: 100,
                marginBottom: 16,
              }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setEditModalVisible(false);
                  setEditingComment(null);
                  setEditText('');
                }}
                style={{
                  flex: 1,
                  backgroundColor: themed.isDark ? '#111827' : '#e5e7eb',
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: themed.text, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={submitEditComment}
                disabled={editing || !editText.trim()}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: editing || !editText.trim() ? (themed.isDark ? '#5b5b5b' : '#fed7aa') : (themed.accent as string),
                }}
              >
                {editing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
