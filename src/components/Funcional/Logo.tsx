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
  /**
   * "auto"  → troca por tema (light=preto / dark=branco)
   * "white" → sempre branco (use em fundos escuros fixos)
   * "black" → sempre preto (use em fundos claros fixos)
   */
  variant?: "auto" | "white" | "black";
}

/**
 * Logo da Funcional Farma.
 *
 * O modo "auto" renderiza ambas as imagens e alterna via Tailwind dark:
 * (sem flash de tema errado). Modos "white" e "black" forçam a cor —
 * use quando o fundo é fixo independente do tema (ex: tela de login,
 * brand panels, e-mails).
 */
export default function Logo({
  width = 140,
  height = 36,
  className = "",
  priority = false,
  variant = "auto",
}: LogoProps) {
  if (variant === "white") {
    return (
      <span className={`inline-flex items-center ${className}`}>
        <Image
          src="/images/logo/logo-branco.png"
          alt="Funcional Farma"
          width={width}
          height={height}
          priority={priority}
          className="object-contain"
          style={{ width, height: "auto" }}
        />
      </span>
    );
  }

  if (variant === "black") {
    return (
      <span className={`inline-flex items-center ${className}`}>
        <Image
          src="/images/logo/logo-preto.png"
          alt="Funcional Farma"
          width={width}
          height={height}
          priority={priority}
          className="object-contain"
          style={{ width, height: "auto" }}
        />
      </span>
    );
  }

  // auto — alterna por tema
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
