import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUploadStore } from "../stores/uploadStore";
import { useReconciliationStore } from "../stores/reconciliationStore";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  Loader2,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { formatBRL } from "../lib/utils";

export function UploadPage() {
  const [periodo, setPeriodo] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [autFile, setAutFile] = useState<File | null>(null);
  const [proFile, setProFile] = useState<File | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const { uploadAutorizador, uploadProteus, uploadSummary, isUploading, error } =
    useUploadStore();
  const { runReconciliation, isRunning } = useReconciliationStore();
  const navigate = useNavigate();

  const handleAutUpload = async () => {
    if (!autFile) return;
    const id = await uploadAutorizador(autFile, periodo);
    setBatchId(id);
    setStep(2);
  };

  const handleProUpload = async () => {
    if (!proFile || !batchId) return;
    await uploadProteus(proFile, batchId);
    setStep(3);
  };

  const handleReconciliation = async () => {
    if (!batchId) return;
    await runReconciliation(batchId);
    navigate(`/reconciliation?batchId=${batchId}`);
  };

  return (
    <div className="max-w-[720px] mx-auto space-y-[25px]">
      {/* Header */}
      <div>
        <h1 className="text-[24px] font-bold text-black">Upload de Planilhas</h1>
        <p className="text-gray-400 text-[13px] mt-[4px]">
          Envie os arquivos do Autorizador e do Proteus para processar
        </p>
      </div>

      {/* Progress Steps */}
      <div className="trezo-card">
        <div className="flex items-center gap-[20px]">
          {[
            { num: 1, label: "Autorizador" },
            { num: 2, label: "Proteus" },
            { num: 3, label: "Conciliar" },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center gap-[10px] flex-1">
              <div
                className={`w-[36px] h-[36px] rounded-full flex items-center justify-center text-[13px] font-bold transition-all ${
                  step > s.num
                    ? "bg-success-500 text-white"
                    : step === s.num
                      ? "bg-primary-500 text-white"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {step > s.num ? <CheckCircle size={16} /> : s.num}
              </div>
              <span
                className={`text-[13px] font-medium ${
                  step >= s.num ? "text-black" : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
              {i < 2 && (
                <div className="flex-1 h-[2px] bg-gray-100 ml-[5px]">
                  <div
                    className="h-full bg-primary-500 transition-all"
                    style={{ width: step > s.num ? "100%" : "0%" }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-danger-50 text-danger-600 px-[17px] py-[12px] rounded-md border border-danger-100 flex items-center gap-[8px] text-[13px]">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Step 1: Autorizador */}
      {step === 1 && (
        <div className="trezo-card space-y-[20px]">
          <div className="flex items-center gap-[12px]">
            <div className="w-[42px] h-[42px] rounded-md bg-primary-50 flex items-center justify-center">
              <FileSpreadsheet className="text-primary-500" size={20} />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-black">
                Arquivo do Autorizador
              </h3>
              <p className="text-[12px] text-gray-400">
                Arquivo "faturamento MMAAAA.xlsx" com aba ORIGINAL
              </p>
            </div>
          </div>

          <div>
            <label className="mb-[10px] text-black font-medium block text-[14px]">
              Período de referência
            </label>
            <input
              type="month"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="h-[45px] rounded-md text-black border border-gray-200 bg-white px-[17px] w-[200px] outline-0 transition-all focus:border-primary-500 text-[13px]"
            />
          </div>

          <DropZone
            file={autFile}
            onFileChange={setAutFile}
            accept=".xlsx,.xls"
            label="Arraste o arquivo do Autorizador aqui"
          />

          <button
            onClick={handleAutUpload}
            disabled={!autFile || isUploading}
            className="block w-full text-center transition-all rounded-md font-medium py-[14px] px-[25px] text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-[14px]"
          >
            {isUploading ? (
              <span className="flex items-center justify-center gap-[8px]">
                <Loader2 size={18} className="animate-spin" />
                Processando...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-[8px]">
                <Upload size={18} />
                Enviar e Processar
              </span>
            )}
          </button>
        </div>
      )}

      {/* Summary after Autorizador */}
      {step >= 2 && uploadSummary && (
        <div className="trezo-card border-l-[4px] border-l-success-500">
          <h4 className="text-[14px] font-semibold text-success-600 mb-[15px] flex items-center gap-[8px]">
            <CheckCircle size={16} />
            Autorizador processado com sucesso
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-[15px]">
            {[
              { label: "Original", value: uploadSummary.totalOriginal },
              { label: "Trabalhada", value: uploadSummary.totalTrabalhada },
              { label: "Valor a faturar", value: formatBRL(uploadSummary.valorTotalFaturar), isCurrency: true },
              { label: "Vazias (sem NF)", value: uploadSummary.totalVazias },
              { label: "Fora do aging", value: uploadSummary.totalForaAging },
              { label: "Excluídas", value: uploadSummary.totalExcluidas },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[12px] text-gray-400">{item.label}</p>
                <p className="text-[16px] font-bold text-black mt-[2px]">
                  {typeof item.value === "number"
                    ? item.value.toLocaleString("pt-BR")
                    : item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Proteus */}
      {step === 2 && (
        <div className="trezo-card space-y-[20px]">
          <div className="flex items-center gap-[12px]">
            <div className="w-[42px] h-[42px] rounded-md bg-secondary-50 flex items-center justify-center">
              <FileSpreadsheet className="text-secondary-500" size={20} />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-black">
                Arquivo do Proteus
              </h3>
              <p className="text-[12px] text-gray-400">
                Arquivo "Fechamento Janssen.xlsx" com notas fiscais
              </p>
            </div>
          </div>

          <DropZone
            file={proFile}
            onFileChange={setProFile}
            accept=".xlsx,.xls"
            label="Arraste o arquivo do Proteus aqui"
          />

          <button
            onClick={handleProUpload}
            disabled={!proFile || isUploading}
            className="block w-full text-center transition-all rounded-md font-medium py-[14px] px-[25px] text-white bg-secondary-500 hover:bg-secondary-600 disabled:opacity-50 text-[14px]"
          >
            {isUploading ? (
              <span className="flex items-center justify-center gap-[8px]">
                <Loader2 size={18} className="animate-spin" />
                Processando...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-[8px]">
                <Upload size={18} />
                Enviar e Processar
              </span>
            )}
          </button>
        </div>
      )}

      {/* Step 3: Conciliar */}
      {step === 3 && (
        <div className="trezo-card text-center py-[40px] space-y-[20px]">
          <div className="mx-auto w-[64px] h-[64px] bg-primary-50 rounded-full flex items-center justify-center">
            <CheckCircle className="text-primary-500" size={32} />
          </div>
          <div>
            <h3 className="text-[20px] font-semibold text-black">
              Arquivos prontos!
            </h3>
            <p className="text-gray-400 text-[13px] mt-[6px]">
              Os dois arquivos foram processados. Clique para iniciar a
              conciliação automática.
            </p>
          </div>
          <button
            onClick={handleReconciliation}
            disabled={isRunning}
            className="inline-flex items-center gap-[8px] transition-all rounded-md font-medium py-[14px] px-[30px] text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-[14px]"
          >
            {isRunning ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Conciliando...
              </>
            ) : (
              <>
                <ArrowRight size={18} />
                Iniciar Conciliação
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function DropZone({
  file,
  onFileChange,
  accept,
  label,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept: string;
  label: string;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) onFileChange(droppedFile);
    },
    [onFileChange]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-md p-[30px] text-center cursor-pointer transition-all ${
        isDragging
          ? "border-primary-500 bg-primary-50"
          : file
            ? "border-success-500 bg-success-50"
            : "border-gray-200 hover:border-gray-300 bg-gray-50"
      }`}
      onClick={() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = accept;
        input.onchange = (e) => {
          const f = (e.target as HTMLInputElement).files?.[0];
          if (f) onFileChange(f);
        };
        input.click();
      }}
    >
      {file ? (
        <div className="flex items-center justify-center gap-[12px]">
          <FileSpreadsheet className="text-success-600" size={24} />
          <div className="text-left">
            <p className="font-medium text-success-700 text-[14px]">
              {file.name}
            </p>
            <p className="text-[11px] text-success-600">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
        </div>
      ) : (
        <>
          <Upload className="mx-auto text-gray-300 mb-[10px]" size={32} />
          <p className="text-gray-400 text-[13px]">{label}</p>
          <p className="text-[11px] text-gray-300 mt-[4px]">
            ou clique para selecionar
          </p>
        </>
      )}
    </div>
  );
}
