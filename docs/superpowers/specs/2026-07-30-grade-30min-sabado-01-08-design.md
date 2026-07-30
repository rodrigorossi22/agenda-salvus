# Especificação de Design: Grade de 30 Minutos Exclusiva para Sábado (01/08/2026)

**Data:** 2026-07-30  
**Ambiente:** Homologação (`/homologacao`)  
**Data Alvo:** Sábado, 01 de Agosto de 2026 (`01-08-2026`)  
**Status:** Aprovado pelo Usuário  

---

## 1. Objetivo

Permitir que na rota de homologação (`/homologacao`), especificamente para o dia **Sábado, 01/08/2026**, os horários de agendamento sejam exibidos e permitidos em intervalos de **30 em 30 minutos** (ex: `08:00`, `08:30`, `09:00`, `09:30`, `10:00`, `10:30`...). Na confirmação do agendamento, o bloco gravado no Feegow terá duração de **30 minutos**, liberando os horários subsequentes para novos clientes.

---

## 2. Escopo Temporal e de Rota

1. **Escopo de Rota:** Ativo **exclusivamente** na rota `/homologacao` (`isHomologation === true`).
2. **Escopo de Data:** Aplicado **estritamente** para a data `01/08/2026` (01 de Agosto de 2026). Para qualquer outra data no calendário, aplicam-se as regras padrão do sistema.

---

## 3. Requisitos Funcionais

1. **Exibição da Grade (01/08/2026):**
   - Na seleção da data `01/08/2026`, o componente calcula os horários vagos em passos de 30 minutos.
   - O paciente vê e pode escolher qualquer início disponível de 30 em 30 min.
   - A descrição comercial do procedimento continua exibindo a duração real estimada (ex: 50 a 60 min) para a experiência do cliente.

2. **Criação no Feegow (`POST /appoints/create`):**
   - Ao agendar para a data `01/08/2026` em homologação, o payload enviado à API da Feegow define `duracao: 30` (ou tempo de 30 min).
   - O Feegow grava o agendamento como um bloco de 30 minutos na agenda do profissional, garantindo a disponibilidade das vagas seguintes.

---

## 4. Arquitetura de Componentes (`OnlineBooking.jsx`)

```javascript
// Verificação de escopo para a regra de 30 min de Sábado 01/08/2026
const isSpecialSaturdayRule = isHomologation && dateKey === '2026-08-01';

if (isSpecialSaturdayRule) {
  // Gera grade de 30 em 30 min sem filtrar colisões de 60 min
  // Gravando duração de 30 min no Feegow
}
```
