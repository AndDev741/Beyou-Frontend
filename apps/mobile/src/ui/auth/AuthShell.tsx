import type { ReactNode } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BrandMark from '../BrandMark';

interface AuthShellProps {
  /** Título da tela. Login e registro não mostram: a marca é o cabeçalho. */
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** Última linha da coluna ("Novo por aqui? Registrar"). */
  footer?: ReactNode;
  testID?: string;
}

/**
 * A casca das telas de autenticação, no desenho da web em largura de telefone:
 * marca no topo (símbolo em acento, wordmark em cor de texto), a coluna de
 * 360px no centro e o rodapé de uma linha que leva à tela irmã.
 *
 * Sem abas Login|Registro: a web troca de tela por um link no rodapé, e duas
 * abas grandes no topo empurravam o formulário para baixo da dobra.
 *
 * Sem seletor de idioma: antes de existir conta o app segue o aparelho (o
 * `i18n.ts` lê `getLocales()`), como a web segue o navegador. Trocar idioma é
 * coisa de usuário logado, na Configuração.
 *
 * `title` é opcional porque na web ele é `sr-only` nesta largura. Login e
 * registro não passam — quem passa são as telas de recuperação e verificação,
 * onde o título é a única coisa que diz para que serve a tela (o app não tem
 * barra de endereço para contar isso).
 */
export default function AuthShell({ title, subtitle, children, footer, testID }: AuthShellProps) {
  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView
        testID={testID}
        keyboardShouldPersistTaps="handled"
        // Ancorado no TOPO, como o mockup: centrado verticalmente a marca
        // caía no meio da tela com um vão enorme em cima, e o teclado
        // empurrava o formulário inteiro a cada foco.
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: 40,
          paddingBottom: 32,
        }}
      >
        <View className="w-full max-w-[360px] self-center">
          <View className="mb-8 items-center gap-2">
            <BrandMark size={44} />
            <Text className="text-xl font-semibold tracking-[-0.02em] text-text">beyou</Text>
          </View>

          {title ? (
            <Text
              accessibilityRole="header"
              className="text-[17px] font-semibold tracking-[-0.015em] text-text"
            >
              {title}
            </Text>
          ) : null}
          {subtitle ? <Text className="mt-1.5 text-[13px] text-text-3">{subtitle}</Text> : null}

          {children}

          {footer ? <View className="mt-4 flex-row justify-center">{footer}</View> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
