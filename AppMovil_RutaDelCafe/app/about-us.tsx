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
  const themed = useThemedStyles(); // 🎨 tema oscuro/claro

  const openEmail = () => {
    Linking.openURL("mailto:contacto@larutadelsabor.com");
  };

  const Card: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => (
    <View
      style={[
        {
          backgroundColor: themed.card,
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: themed.border,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themed.background }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 20, paddingTop: 10 }}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: themed.background }}
      >
        {/* Encabezado con logo */}
        <View style={{ alignItems: "center", marginBottom: 30, paddingTop: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 20 }}>
            <Image
              source={require("../app/images/Univalle.png")}
              style={{
                width: 100,
                height: 100,
                borderRadius: 999,
                borderWidth: 3,
                borderColor: themed.accent as string,
                backgroundColor: "#FFFFFF",
                marginHorizontal: 10,
              }}
              resizeMode="contain"
            />
            <Image
              source={require("../app/images/LOGOTIPO.png")}
              style={{
                width: 100,
                height: 100,
                borderRadius: 20,
                borderWidth: 3,
                borderColor: themed.accent as string,
                backgroundColor: "#FFFFFF",
                marginHorizontal: 10,
              }}
              resizeMode="contain"
            />
          </View>
          <Text style={{ fontSize: 28, fontWeight: "800", color: themed.accent as string, textAlign: "center", marginBottom: 4 }}>
            La Ruta del Sabor
          </Text>
          <Text style={{ fontSize: 16, color: themed.muted as string, textAlign: "center", fontStyle: "italic" }}>
            Descubre los sabores de tu ciudad
          </Text>
        </View>

        {/* ¿Quiénes somos? */}
        <Card>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: themed.accent as string,
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            ¿Quiénes Somos?
          </Text>
          <Text style={{ fontSize: 16, color: themed.text, lineHeight: 22, textAlign: "justify", marginBottom: 12 }}>
            Somos un equipo de estudiantes de Ingeniería de Sistemas de la Universidad del Valle,
            apasionados por la tecnología y la innovación. Este proyecto nace como iniciativa
            académica para combinar nuestros conocimientos técnicos con el mundo gastronómico.
          </Text>
          <Text style={{ fontSize: 16, color: themed.text, lineHeight: 22, textAlign: "justify" }}>
            Nuestra misión es crear soluciones tecnológicas que impacten positivamente en la
            comunidad, comenzando con esta aplicación que busca revolucionar la forma en que
            las personas descubren y disfrutan de la gastronomía local.
          </Text>
        </Card>

        {/* Proyecto */}
        <Card>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: themed.accent as string,
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            Nuestro Proyecto
          </Text>
          <Text style={{ fontSize: 16, color: themed.text, lineHeight: 22, textAlign: "justify" }}>
            "La Ruta del Sabor" es una aplicación móvil desarrollada como parte del Proyecto de
            Sistemas III. Nuestro objetivo es conectar a los amantes de la buena comida con los
            establecimientos gastronómicos locales, ofreciendo una experiencia culinaria única
            y personalizada.
          </Text>
        </Card>

        {/* Equipo */}
        <Card>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: themed.accent as string,
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            Nuestro Equipo
          </Text>
          <Text style={{ fontSize: 16, color: themed.text, lineHeight: 22, textAlign: "justify", marginBottom: 12 }}>
            Contamos con un equipo multidisciplinario de desarrolladores, diseñadores y
            especialistas en experiencia de usuario, todos estudiantes de Ingeniería de Sistemas
            comprometidos con la excelencia académica y la innovación tecnológica.
          </Text>

          <View style={{ flexDirection: "row", justifyContent: "space-around", paddingTop: 12, borderTopWidth: 1, borderColor: themed.border }}>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text style={{ fontSize: 24, fontWeight: "800", color: themed.accent as string }}>3</Text>
              <Text style={{ fontSize: 12, color: themed.muted as string, marginTop: 4, textAlign: "center" }}>Desarrolladores</Text>
            </View>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text style={{ fontSize: 24, fontWeight: "800", color: themed.accent as string }}>3</Text>
              <Text style={{ fontSize: 12, color: themed.muted as string, marginTop: 4, textAlign: "center" }}>Meses de trabajo</Text>
            </View>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text style={{ fontSize: 24, fontWeight: "800", color: themed.accent as string }}>1000+</Text>
              <Text style={{ fontSize: 12, color: themed.muted as string, marginTop: 4, textAlign: "center" }}>Líneas de código</Text>
            </View>
          </View>
        </Card>

        {/* Detalles académicos */}
        <Card>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: themed.accent as string,
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            Proyecto de Sistemas III
          </Text>
          <Text style={{ fontSize: 16, color: themed.text, lineHeight: 22, textAlign: "justify", marginBottom: 12 }}>
            Esta aplicación fue desarrollada como parte del curso de Proyecto de Sistemas III
            de la Facultad de Ingeniería de Sistemas de la Universidad del Valle. El proyecto
            busca integrar todos los conocimientos adquiridos durante la carrera en una
            aplicación funcional y de calidad profesional.
          </Text>
          <Text style={{ fontSize: 16, color: themed.text, lineHeight: 22, textAlign: "justify" }}>
            El desarrollo incluye tecnologías modernas como React Native, Node.js, bases de
            datos MySQL y APIs RESTful, siguiendo las mejores prácticas de desarrollo de software.
          </Text>
        </Card>

        {/* Contacto */}
        <Card>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: themed.accent as string,
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            Contáctanos
          </Text>
          <Text style={{ fontSize: 16, color: themed.text, lineHeight: 22, textAlign: "justify", marginBottom: 12 }}>
            ¿Tienes preguntas, sugerencias o comentarios sobre nuestra aplicación?
            Nos encantaría escuchar tu opinión para seguir mejorando.
          </Text>

          <TouchableOpacity
            onPress={openEmail}
            style={{
              flexDirection: "row",
              backgroundColor: themed.accent as string,
              paddingVertical: 12,
              paddingHorizontal: 20,
              borderRadius: 24,
              alignItems: "center",
              justifyContent: "center",
              alignSelf: "center",
              marginTop: 8,
            }}
          >
            <Ionicons name="mail" size={20} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontWeight: "800", marginLeft: 10, fontSize: 16 }}>
              Enviar mensaje
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Botón volver */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            flexDirection: "row",
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 12,
            backgroundColor: themed.isDark ? "#0b1220" : "#fff7ed",
            borderWidth: 1,
            borderColor: themed.accent,
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "center",
            marginBottom: 30,
          }}
        >
          <Ionicons name="arrow-back" size={20} color={themed.accent as string} />
          <Text style={{ color: themed.accent as string, fontSize: 16, fontWeight: "600", marginLeft: 10 }}>
            Volver al inicio
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={{ alignItems: "center", paddingVertical: 16 }}>
          <Text style={{ fontSize: 12, color: themed.muted as string, textAlign: "center", marginBottom: 4 }}>
            © 2023 La Ruta del Sabor - Proyecto de Sistemas III
          </Text>
          <Text style={{ fontSize: 12, color: themed.muted as string, textAlign: "center" }}>
            Universidad del Valle - Ingeniería de Sistemas
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
