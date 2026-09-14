-- Migration: novo tipo de divergência VALOR_NAO_RECONHECIDO.
--
-- Motivação: planilhas exportadas com a coluna de valor em formato "Geral"
-- (texto como "R$ 1.234,56") não eram lidas como número e o valor virava zero
-- silenciosamente. O parser passou a aceitar esses formatos e, quando ainda
-- assim a célula não puder ser interpretada, a linha é sinalizada com este
-- tipo de divergência em vez de ser tratada como valor zero/vazio.
ALTER TYPE "TipoDivergencia" ADD VALUE IF NOT EXISTS 'VALOR_NAO_RECONHECIDO';
