import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — Funcional Farma",
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-[#f5f7fa] dark:bg-[#0a0e19] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-[#0d1526] rounded-2xl shadow-sm border border-gray-100 dark:border-[#1e2d47] p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Política de Privacidade
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Última atualização: {new Date().toLocaleDateString("pt-BR")}
          </p>

          <div className="space-y-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            <Section title="1. Controlador dos Dados">
              <p>
                A Funcional Farma é a controladora dos dados pessoais processados nesta plataforma,
                nos termos da Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018).
              </p>
            </Section>

            <Section title="2. Dados Tratados">
              <p>
                Esta plataforma processa exclusivamente dados de faturamento e operacionais:
                códigos de autorização (vouchers), identificadores anonimizados de pacientes
                (BR-A / DSP), CNPJ de clínicas credenciadas, valores financeiros e notas fiscais.
              </p>
              <p className="mt-2">
                <strong>Não são armazenados</strong> nome, CPF, endereço ou qualquer dado diretamente
                identificável de pacientes. Os identificadores utilizados são códigos opacos gerados
                pelo sistema da Johnson &amp; Johnson.
              </p>
            </Section>

            <Section title="3. Bases Legais (art. 7º LGPD)">
              <p>O tratamento é realizado com base em:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Execução de contrato (faturamento J&amp;J — art. 7º, V)</li>
                <li>Cumprimento de obrigação legal ou regulatória (art. 7º, II)</li>
                <li>Legítimo interesse do controlador (art. 7º, IX), limitado ao necessário</li>
              </ul>
            </Section>

            <Section title="4. Compartilhamento">
              <p>
                Os dados são compartilhados com a Johnson &amp; Johnson apenas na forma das planilhas
                de faturamento geradas pelo sistema. Não há compartilhamento com terceiros não
                relacionados à operação.
              </p>
            </Section>

            <Section title="5. Segurança">
              <p>
                Adotamos medidas técnicas e organizacionais adequadas: autenticação com senha
                forte, controle de acesso por perfil (RBAC), audit log de todas as operações,
                criptografia em trânsito (TLS/HTTPS), e backups diários do banco de dados.
              </p>
            </Section>

            <Section title="6. Retenção">
              <p>
                Os dados de faturamento são retidos pelo período necessário ao cumprimento das
                obrigações legais e contratuais, conforme definido pela Funcional Farma em conjunto
                com sua assessoria jurídica.
              </p>
            </Section>

            <Section title="7. Direitos do Titular (art. 18 LGPD)">
              <p>
                Os titulares de dados pessoais podem solicitar: confirmação de tratamento, acesso,
                correção, anonimização, portabilidade, eliminação e revogação de consentimento.
                Solicitações devem ser encaminhadas ao encarregado (DPO) da Funcional Farma.
              </p>
            </Section>

            <Section title="8. Incidentes (art. 48 LGPD)">
              <p>
                Em caso de incidente de segurança com potencial impacto relevante aos titulares,
                a Funcional Farma comunicará à ANPD e aos titulares afetados em prazo razoável,
                conforme exigido pela LGPD.
              </p>
            </Section>

            <Section title="9. Contato">
              <p>
                Para dúvidas sobre privacidade, entre em contato com o time responsável pela
                plataforma na Funcional Farma.
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
