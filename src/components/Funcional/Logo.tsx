import Image from "next/image";

interface LogoProps {
  /** Largura em px. A altura é calculada proporcionalmente. */
  width?: number;
  /** Altura em px. */
  height?: number;
  /** Classes extras pro wrapper. */
  className?: string;
  /** Prioriza o carregamento (use em above-the-fold como sidebar/login). */
  priority?: boolean;
}

/**
 * Logo da Funcional Farma com troca automática por tema.
 * - Light theme → logo preto
 * - Dark theme  → logo branco
 *
 * Renderiza ambas as imagens e usa Tailwind para alternar via `dark:` —
 * sem flash de tema errado e sem dependência de JS.
 */
export default function Logo({
  width = 140,
  height = 36,
  className = "",
  priority = false,
}: LogoProps) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <Image
        src="/images/logo/logo-preto.png"
        alt="Funcional Farma"
        width={width}
        height={height}
        priority={priority}
        className="block dark:hidden object-contain"
        style={{ width, height: "auto" }}
      />
      <Image
        src="/images/logo/logo-branco.png"
        alt="Funcional Farma"
        width={width}
        height={height}
        priority={priority}
        className="hidden dark:block object-contain"
        style={{ width, height: "auto" }}
      />
    </span>
  );
}
