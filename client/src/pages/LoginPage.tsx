import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { Loader2, Eye, EyeOff } from "lucide-react";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Email ou senha inválidos");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-[60px] md:py-[80px]">
      <div className="w-full max-w-[460px] px-[12.5px]">
        {/* Logo */}
        <div className="text-center mb-[30px]">
          <h1 className="text-[32px] font-bold text-black tracking-tight">
            Funcional
          </h1>
          <p className="text-gray-500 text-[14px] mt-[8px]">
            Dashboard de Faturamento J&J
          </p>
        </div>

        {/* Card */}
        <div className="trezo-card">
          <h2 className="text-[20px] font-semibold text-black mb-[5px]">
            Entrar na sua conta
          </h2>
          <p className="text-gray-400 text-[13px] mb-[25px]">
            Insira suas credenciais para acessar o dashboard
          </p>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="bg-danger-50 text-danger-600 text-[13px] px-[17px] py-[12px] rounded-md border border-danger-100 mb-[20px]">
                {error}
              </div>
            )}

            {/* Email */}
            <div className="mb-[15px]">
              <label className="mb-[10px] text-black font-medium block text-[14px]">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-[55px] rounded-md text-black border border-gray-200 bg-white px-[17px] block w-full outline-0 transition-all placeholder:text-gray-400 focus:border-primary-500"
                placeholder="seu@email.com"
                required
              />
            </div>

            {/* Password */}
            <div className="mb-[20px]">
              <label className="mb-[10px] text-black font-medium block text-[14px]">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-[55px] rounded-md text-black border border-gray-200 bg-white px-[17px] pr-[50px] block w-full outline-0 transition-all placeholder:text-gray-400 focus:border-primary-500"
                  placeholder="Sua senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-[17px] top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="block w-full text-center transition-all rounded-md font-medium py-[14px] px-[25px] text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-[15px]"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-[8px]">
                  <Loader2 size={18} className="animate-spin" />
                  Entrando...
                </span>
              ) : (
                "Entrar"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 text-[12px] mt-[20px]">
          Funcional Farma &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
