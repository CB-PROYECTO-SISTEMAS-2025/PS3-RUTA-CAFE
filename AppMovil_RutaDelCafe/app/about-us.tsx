import React from "react";
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView,
  Linking,
  Dimensions 
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get('window');

export default function AboutUs() {
  const router = useRouter();

  const openEmail = () => {
    Linking.openURL('mailto:contacto@larutadelsabor.com');
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFF5E6]">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-5 pt-2.5">
        {/* Encabezado con logo de la aplicación */}
        <View className="items-center mb-[30px] pt-5">
          <View className="flex-row justify-center items-center mb-5">
            <Image 
              source={require("../app/images/Univalle.png")}
              className="w-[100px] h-[100px] rounded-full border-[3px] border-[#FFB74D] bg-white mx-2.5" 
              resizeMode="contain"
            />
            <Image 
              source={require("../app/images/LOGOTIPO.png")}
              className="w-[100px] h-[100px] rounded-[20px] border-[3px] border-[#E65100] bg-white mx-2.5" 
              resizeMode="contain"
            />
          </View>
          <Text className="text-[28px] font-bold text-[#E65100] text-center mb-1">
            La Ruta del Sabor
          </Text>
          <Text className="text-[16px] text-[#FF8C00] text-center italic mb-2.5">
            Descubre los sabores de tu ciudad
          </Text>
        </View>

        {/* Tarjeta de información principal */}
        <View className="bg-white rounded-[15px] p-5 mb-5 shadow-lg border border-[#FFE0B2]">
          <Text className="text-[20px] font-bold text-[#E65100] mb-[15px] text-center">
            ¿Quiénes Somos?
          </Text>
          <Text className="text-[16px] text-[#5D4037] leading-[22px] text-justify mb-[15px]">
            Somos un equipo de estudiantes de Ingeniería de Sistemas de la Universidad del Valle, 
            apasionados por la tecnología y la innovación. Este proyecto nace como iniciativa 
            académica para combinar nuestros conocimientos técnicos con el mundo gastronómico.
          </Text>
          <Text className="text-[16px] text-[#5D4037] leading-[22px] text-justify">
            Nuestra misión es crear soluciones tecnológicas que impacten positivamente en la 
            comunidad, comenzando con esta aplicación que busca revolucionar la forma en que 
            las personas descubren y disfrutan de la gastronomía local.
          </Text>
        </View>

        {/* Tarjeta sobre el proyecto */}
        <View className="bg-white rounded-[15px] p-5 mb-5 shadow-lg border border-[#FFE0B2]">
          <Text className="text-[20px] font-bold text-[#E65100] mb-[15px] text-center">
            Nuestro Proyecto
          </Text>
          <Text className="text-[16px] text-[#5D4037] leading-[22px] text-justify">
            "La Ruta del Sabor" es una aplicación móvil desarrollada como parte del Proyecto de 
            Sistemas III. Nuestro objetivo es conectar a los amantes de la buena comida con los 
            establecimientos gastronómicos locales, ofreciendo una experiencia culinaria única 
            y personalizada.
          </Text>
        </View>

        {/* Equipo de desarrollo */}
        <View className="bg-white rounded-[15px] p-5 mb-5 shadow-lg border border-[#FFE0B2]">
          <Text className="text-[20px] font-bold text-[#E65100] mb-[15px] text-center">
            Nuestro Equipo
          </Text>
          <Text className="text-[16px] text-[#5D4037] leading-[22px] text-justify mb-[15px]">
            Contamos con un equipo multidisciplinario de desarrolladores, diseñadores y 
            especialistas en experiencia de usuario, todos estudiantes de Ingeniería de Sistemas 
            comprometidos con la excelencia académica y la innovación tecnológica.
          </Text>
          
          <View className="flex-row justify-around mt-5 pt-[15px] border-t border-[#FFE0B2]">
            <View className="items-center flex-1">
              <Text className="text-[24px] font-bold text-[#E65100]">3</Text>
              <Text className="text-[12px] text-[#5D4037] mt-1 text-center">Desarrolladores</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-[24px] font-bold text-[#E65100]">3</Text>
              <Text className="text-[12px] text-[#5D4037] mt-1 text-center">Meses de trabajo</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-[24px] font-bold text-[#E65100]">1000+</Text>
              <Text className="text-[12px] text-[#5D4037] mt-1 text-center">Líneas de código</Text>
            </View>
          </View>
        </View>

        {/* Detalles académicos */}
        <View className="bg-white rounded-[15px] p-5 mb-5 shadow-lg border border-[#FFE0B2]">
          <Text className="text-[20px] font-bold text-[#E65100] mb-[15px] text-center">
            Proyecto de Sistemas III
          </Text>
          <Text className="text-[16px] text-[#5D4037] leading-[22px] text-justify mb-[15px]">
            Esta aplicación fue desarrollada como parte del curso de Proyecto de Sistemas III 
            de la Facultad de Ingeniería de Sistemas de la Universidad del Valle. El proyecto 
            busca integrar todos los conocimientos adquiridos durante la carrera en una 
            aplicación funcional y de calidad profesional.
          </Text>
          <Text className="text-[16px] text-[#5D4037] leading-[22px] text-justify">
            El desarrollo incluye tecnologías modernas como React Native, Node.js, bases de 
            datos MySQL y APIs RESTful, siguiendo las mejores prácticas de desarrollo de software.
          </Text>
        </View>

        {/* Contacto */}
        <View className="bg-white rounded-[15px] p-5 mb-5 shadow-lg border border-[#FFE0B2]">
          <Text className="text-[20px] font-bold text-[#E65100] mb-[15px] text-center">
            Contáctanos
          </Text>
          <Text className="text-[16px] text-[#5D4037] leading-[22px] text-justify mb-[15px]">
            ¿Tienes preguntas, sugerencias o comentarios sobre nuestra aplicación? 
            Nos encantaría escuchar tu opinión para seguir mejorando.
          </Text>
          
          <TouchableOpacity 
            className="flex-row bg-[#E65100] py-3 px-5 rounded-[25px] items-center justify-center mt-[15px] self-center"
            onPress={openEmail}
          >
            <Ionicons name="mail" size={20} color="white" />
            <Text className="text-white font-bold ml-2.5 text-[16px]">Enviar mensaje</Text>
          </TouchableOpacity>
        </View>

        {/* Botón para volver */}
        <TouchableOpacity 
          className="flex-row py-3.5 px-6 rounded-[10px] bg-[#FFE0B2] border border-[#FFB74D] items-center justify-center mb-[30px] self-center"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#FF8C00" />
          <Text className="text-[#FF8C00] text-[16px] font-medium ml-2.5">Volver al inicio</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View className="items-center py-5">
          <Text className="text-[12px] text-[#FF8C00] text-center mb-1">
            © 2023 La Ruta del Sabor - Proyecto de Sistemas III
          </Text>
          <Text className="text-[12px] text-[#FF8C00] text-center">
            Universidad del Valle - Ingeniería de Sistemas
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}