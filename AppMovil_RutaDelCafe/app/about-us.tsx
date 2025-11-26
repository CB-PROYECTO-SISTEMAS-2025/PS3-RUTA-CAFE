import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Linking,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemedStyles } from "../hooks/useThemedStyles";

const { width } = Dimensions.get("window");

export default function AboutUs() {
  const router = useRouter();
  const themed = useThemedStyles();

  const openEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const Card: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => (
    <View
      style={[
        {
          backgroundColor: themed.card,
          borderRadius: 20,
          padding: 20,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: themed.border,
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  const DeveloperCard: React.FC<{ name: string; role: string; email: string; isLast?: boolean }> = 
    ({ name, role, email, isLast }) => (
    <View style={{ 
      flexDirection: "row", 
      alignItems: "center", 
      marginBottom: isLast ? 0 : 16, 
      paddingBottom: isLast ? 0 : 16, 
      borderBottomWidth: isLast ? 0 : 1, 
      borderColor: themed.border 
    }}>
      <View style={{
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: themed.accent + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
      }}>
        <Ionicons name="person" size={24} color={themed.accent as string} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "800", color: themed.accent as string, marginBottom: 4 }}>
          {name}
        </Text>
        <Text style={{ fontSize: 14, color: themed.text, marginBottom: 2, fontWeight: '600' }}>
          {role}
        </Text>
        <Text style={{ fontSize: 12, color: themed.muted as string }}>
          {email}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => openEmail(email)}
        style={{
          padding: 10,
          backgroundColor: themed.accent as string,
          borderRadius: 12,
          marginLeft: 10,
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        }}
      >
        <Ionicons name="mail" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  const StatCard: React.FC<{ value: string; label: string }> = ({ value, label }) => (
    <View style={{ 
      alignItems: "center", 
      flex: 1,
      backgroundColor: themed.accent + '15',
      padding: 12,
      borderRadius: 16,
      marginHorizontal: 4,
      borderWidth: 1,
      borderColor: themed.accent + '30'
    }}>
      <Text style={{ fontSize: 22, fontWeight: "900", color: themed.accent as string }}>{value}</Text>
      <Text style={{ fontSize: 11, color: themed.muted as string, marginTop: 4, textAlign: "center", fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themed.background }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 16, paddingTop: 10 }}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: themed.background }}
      >
        {/* Header con gradiente */}
        <View style={{ 
          alignItems: "center", 
          marginBottom: 30, 
          paddingTop: 20,
          paddingBottom: 20,
          backgroundColor: themed.accent + '15',
          borderRadius: 24,
          marginHorizontal: 8,
          borderWidth: 1,
          borderColor: themed.accent + '30'
        }}>
          <View style={{ 
            flexDirection: "row", 
            justifyContent: "center", 
            alignItems: "center", 
            marginBottom: 16 
          }}>
            <Image
              source={require("../app/images/Univalle.png")}
              style={{
                width: 80,
                height: 80,
                borderRadius: 999,
                borderWidth: 3,
                borderColor: themed.accent as string,
                backgroundColor: "#FFFFFF",
                margin: 6,
              }}
              resizeMode="contain"
            />
            <Image
              source={require("../app/images/LOGOTIPO.png")}
              style={{
                width: 80,
                height: 80,
                borderRadius: 16,
                borderWidth: 3,
                borderColor: themed.accent as string,
                backgroundColor: "#FFFFFF",
                margin: 6,
              }}
              resizeMode="contain"
            />
            <Image
              source={require("../app/images/UMA.jpeg")}
              style={{
                width: 80,
                height: 80,
                borderRadius: 16,
                borderWidth: 3,
                borderColor: themed.accent as string,
                backgroundColor: "#FFFFFF",
                margin: 6,
              }}
              resizeMode="contain"
            />
          </View>
          <Text style={{ 
            fontSize: width < 400 ? 24 : 28, 
            fontWeight: "900", 
            color: themed.accent as string, 
            textAlign: "center", 
            marginBottom: 6,
            textShadowColor: themed.accent + '40',
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 4
          }}>
            La Ruta del Sabor
          </Text>
          <Text style={{ 
            fontSize: 14, 
            color: themed.muted as string, 
            textAlign: "center", 
            fontStyle: "italic",
            fontWeight: '500'
          }}>
            Descubre los sabores de tu ciudad
          </Text>
        </View>

        {/* ¿Quiénes somos? */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: themed.accent as string,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12
            }}>
              <Ionicons name="people" size={20} color="#FFFFFF" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: "900", color: themed.accent as string }}>
              ¿Quiénes Somos?
            </Text>
          </View>
          <Text style={{ fontSize: 15, color: themed.text, lineHeight: 24, textAlign: "justify", marginBottom: 12 }}>
            Somos un equipo de estudiantes de <Text style={{ fontWeight: '800', color: themed.accent as string }}>Ingeniería de Sistemas Informáticos (ISI)</Text> de la Universidad del Valle, apasionados por la tecnología y la innovación.
          </Text>
          <Text style={{ fontSize: 15, color: themed.text, lineHeight: 24, textAlign: "justify" }}>
            Nuestra misión es crear <Text style={{ fontWeight: '700' }}>soluciones tecnológicas</Text> que impacten positivamente en la comunidad, comenzando con esta aplicación que busca revolucionar la forma en que las personas descubren y disfrutan de la gastronomía local.
          </Text>
        </Card>

        {/* Proyecto */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#10b981',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12
            }}>
              <Ionicons name="rocket" size={20} color="#FFFFFF" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: "900", color: '#10b981' }}>
              Nuestro Proyecto
            </Text>
          </View>
          <Text style={{ fontSize: 15, color: themed.text, lineHeight: 24, textAlign: "justify" }}>
            <Text style={{ fontWeight: '800', fontStyle: 'italic', color: themed.accent as string }}>"La Ruta del Sabor"</Text> es una aplicación móvil desarrollada como parte del <Text style={{ fontWeight: '700' }}>Proyecto de Sistemas III</Text>. Conectamos a los amantes de la buena comida con establecimientos gastronómicos locales, ofreciendo una experiencia culinaria única y personalizada.
          </Text>
        </Card>

        {/* Equipo de Desarrollo */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#8b5cf6',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12
            }}>
              <Ionicons name="code-slash" size={20} color="#FFFFFF" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: "900", color: '#8b5cf6' }}>
              Equipo de Desarrollo
            </Text>
          </View>
          
          <DeveloperCard 
            name="Manuel Augusto Ovando Crespo" 
            role="Estudiante de 6to Semestre - ISI" 
            email="ocm1010217@est.univalle.edu" 
          />
          <DeveloperCard 
            name="Rolando Valdivia Rodriguez" 
            role="Estudiante de 6to Semestre - ISI" 
            email="vrr0032855@est.univalle.edu" 
          />
          <DeveloperCard 
            name="Luis Mario García Chambilla" 
            role="Estudiante de 6to Semestre - ISI" 
            email="gcl0033412@est.univalle.edu" 
            isLast={true}
          />
        </Card>

        {/* Detalles académicos */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#f59e0b',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12
            }}>
              <Ionicons name="school" size={20} color="#FFFFFF" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: "900", color: '#f59e0b' }}>
              Proyecto de Sistemas III
            </Text>
          </View>
          <Text style={{ fontSize: 15, color: themed.text, lineHeight: 24, textAlign: "justify", marginBottom: 12 }}>
            Esta aplicación fue desarrollada como parte del curso de <Text style={{ fontWeight: '800' }}>Proyecto de Sistemas III</Text> de la Facultad de Ingeniería de Sistemas Informáticos de la Universidad del Valle.
          </Text>
          <Text style={{ fontSize: 15, color: themed.text, lineHeight: 24, textAlign: "justify" }}>
            Integramos tecnologías modernas como <Text style={{ fontWeight: '700', color: '#3b82f6' }}>React Native</Text>, <Text style={{ fontWeight: '700', color: '#10b981' }}>Node.js</Text>, <Text style={{ fontWeight: '700', color: '#f59e0b' }}>MySQL</Text> y <Text style={{ fontWeight: '700', color: '#ef4444' }}>APIs RESTful</Text>, siguiendo las mejores prácticas de desarrollo de software.
          </Text>
        </Card>

        {/* Estadísticas del equipo */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#ec4899',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12
            }}>
              <Ionicons name="stats-chart" size={20} color="#FFFFFF" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: "900", color: '#ec4899' }}>
              Nuestro Equipo
            </Text>
          </View>

          <View style={{ 
            flexDirection: width < 400 ? "column" : "row", 
            justifyContent: "space-around",
            gap: 8
          }}>
            <StatCard value="3" label="Desarrolladores" />
            <StatCard value="6to" label="Semestre" />
            <StatCard value="ISI" label="Carrera" />
          </View>
        </Card>

        {/* Botón volver */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            flexDirection: "row",
            paddingVertical: 16,
            paddingHorizontal: 32,
            borderRadius: 16,
            backgroundColor: themed.accent as string,
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "center",
            marginBottom: 30,
            marginTop: 10,
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "800", marginLeft: 10 }}>
            Volver al inicio
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={{ 
          alignItems: "center", 
          paddingVertical: 20,
          paddingHorizontal: 16,
          backgroundColor: themed.accent + '10',
          borderRadius: 16,
          marginHorizontal: 8,
          borderWidth: 1,
          borderColor: themed.accent + '20'
        }}>
          <Text style={{ fontSize: 12, color: themed.muted as string, textAlign: "center", marginBottom: 4, fontWeight: '600' }}>
            © 2024 La Ruta del Sabor - Proyecto de Sistemas III
          </Text>
          <Text style={{ fontSize: 12, color: themed.muted as string, textAlign: "center", fontWeight: '600' }}>
            Universidad del Valle - Ingeniería de Sistemas Informáticos
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}