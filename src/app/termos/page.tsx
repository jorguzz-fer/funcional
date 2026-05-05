import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso — Funcional Farma",
};

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-[#f5f7fa] dark:bg-[#0a0e19] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl shadow-sm border border-gray-100 dark:border-[#1e2d47] p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Termos de Uso
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Última atualização: {new Date().toLocaleDateString("pt-BR")}
          </p>

          <div className="space-y-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            <Section title="1. Aceitação">
              <p>
                Ao acessar esta plataforma, o usuário concorda com os presentes Termos de Uso.
                O uso continuado após alterações implica aceitação das novas condições.
              </p>
            </Section>

            <Section title="2. Objeto">
              <p>
                Esta plataforma tem por objeto automatizar o processo de conciliação de faturamento
                entre a Funcional Farma e a Johnson &amp; Johnson, consolidando dados dos sistemas
                Autorizador e Proteus.
              </p>
            </Section>

            <Section title="3. Conta e Credenciais">
              <p>
                O acesso é restrito a colaboradores autorizados da Funcional Farma. As credenciais
                são pessoais e intransferíveis. O usuário é responsável por manter sua senha segura
                e comunicar imediatamente qualquer uso não autorizado.
              </p>
            </Section>

            <Section title="4. Perfis de Acesso">
              <p>O acesso é controlado por perfis: Administrador, Supervisor, Analista e Visualizador.
              Cada perfil possui permissões específicas conforme definido pela Funcional Farma.</p>
            </Section>

            <Section title="5. Uso Aceitável">
              <p>É vedado:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Compartilhar credenciais de acesso</li>
                <li>Exportar dados para fins não relacionados ao faturamento J&amp;J</li>
                <li>Tentar acessar dados de outros usuários ou sistemas não autorizados</li>
                <li>Modificar ou excluir registros sem autorização do perfil adequado</li>
              </ul>
            </Section>

            <Section title="6. Propriedade Intelectual">
              <p>
                O software, layout e componentes desta plataforma são de titularidade dos seus
                respectivos desenvolvedores. Os dados de faturamento pertencem à Funcional Farma.
              </p>
            </Section>

            <Section title="7. Disponibilidade">
              <p>
                A plataforma é disponibilizada em regime de melhor esforço. Manutenções programadas
                serão comunicadas previamente. Não garantimos disponibilidade ininterrupta.
              </p>
            </Section>

            <Section title="8. Limitação de Responsabilidade">
              <p>
                O desenvolvedor não se responsabiliza por perdas decorrentes de uso inadequado,
                falha de infraestrutura de terceiros ou eventos de força maior.
              </p>
            </Section>

            <Section title="9. Dados e Segurança">
              <p>
                O tratamento de dados segue a Política de Privacidade desta plataforma e as
                disposições da LGPD. Veja a{" "}
                <a href="/privacidade" className="text-primary-500 hover:underline">
                  Política de Privacidade
                </a>
                .
              </p>
            </Section>

            <Section title="10. Alterações">
              <p>
                Estes termos podem ser alterados a qualquer tempo. Alterações relevantes serão
                comunicadas aos usuários ativos. O uso continuado implica aceitação.
              </p>
            </Section>

            <Section title="11. Foro">
              <p>
                Fica eleito o foro da comarca de sede da Funcional Farma para dirimir quaisquer
                controvérsias decorrentes destes Termos.
              </p>
            </Section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-[#1e2d47]">
            <a
              href="/login"
              className="text-sm text-primary-500 hover:underline"
            >
              ← Voltar para o login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h2>
      {children}
    </div>
  );
}
