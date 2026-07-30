# Especificação de Arquitetura: Robô de Vagas Relâmpago & Fila de Espera (Bulletproof)

**Data:** 2026-07-30  
**Projeto:** Clínica Salvus (n8n + Feegow API + PostgreSQL + WhatsApp Evolution)  
**Status:** Aprovado pelo Usuário  

---

## 1. Objetivos

1. Garante que **nenhum paciente** que já tenha realizado 2 atendimentos concluídos (Status ID 3 - Atendido) no mês receba notificações da Fila de Espera.
2. Permite a **antecipação / troca de horário** para pacientes com agendamentos futuros, excluindo automaticamente a consulta futura mais distante ao confirmar a vaga relâmpago.
3. Aplica **todas as travas operacionais da clínica** (almoço da Mônica 14h-15h, colisão de 60 min, limite de equipamentos e dias de atendimento por profissional).

---

## 2. Regras de Elegibilidade do Paciente (Pre-Flight Check)

Ao processar cada candidato da tabela `salvus_waitlist`:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Consulta Paciente no Feegow pelo Telefone                 │
│    GET /patients/search?telefone=<numero>                   │
└───────────┬─────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Busca Agendamentos do Paciente no Mês                     │
│    GET /appoints/list?paciente_id=<id>&data_start=...       │
└───────────┬─────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Validação de Cotas:                                      │
│    a) Qtd. de Atendimentos REALIZADOS (status_id = 3)       │
│       - Se realizadoCount >= 2 ➔ BLOQUEIA (Cota esgotada)   │
│    b) Qtd. de Atendimentos Ativos na Semana                  │
│       - Se semanaCount >= 1 ➔ BLOQUEIA (1 por semana)       │
│    c) Se possui 2 agendamentos FUTUROS:                     │
│       - LIBERA disparo de antecipação.                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Regras de Elegibilidade do Horário (Feegow + Clínica)

1. **Trava de Almoço Dra. Mônica (ID 15):**
   - Janela 14:00 às 15:00 totalmente protegida.
   - Qualquer slot de 60 min que inicie entre 13:01 e 14:59 (ex: 13:30h) ou termine após 14:00 é sumariamente desqualificado.

2. **Janela Livre Contínua de 60 Minutos:**
   - Um slot às `HH:mm` precisa de 60 minutos livres de colisão com qualquer outro paciente agendado para o mesmo profissional (ex: se há consulta às 18:20h, o slot das 18:00h é inválido por colisão).

3. **Dias e Equipamentos:**
   - Esteticista (ID 16): apenas Terça (2), Quinta (4) e Sexta (5).
   - Enfermagem (ID 5): apenas horários específicos liberados em sistema.

---

## 4. Mecanismo de Troca Automática (Slot Swapping)

Quando um paciente aceita uma Vaga Relâmpago através do link `https://agenda-salvus.vercel.app/agendamento_online?date=DD-MM-YYYY&time=HH:mm`:

1. O paciente realiza o agendamento da nova vaga.
2. O webhook de confirmação de agendamento (`/agendamento-online-confirmacao`) no n8n:
   - Verifica se o paciente possui mais de 2 agendamentos no mês vigente.
   - Localiza o agendamento com a data mais distante no mês.
   - Executa a chamada `POST /appoints/status-update` na API da Feegow com `status_id = 11` (Cancelado) e obs: `"Substituído automaticamente por Vaga Relâmpago antecipada"`.
