# Especificação de Design: Busca de Paciente Existente por Telefone com Fallback por CPF

**Data:** 2026-07-30  
**Ambiente:** Homologação / Staging (`Feegow/Agenda Salvus`)  
**Status:** Aprovado pelo Usuário  

---

## 1. Objetivo

Aprimorar a experiência do paciente no fluxo "Já sou paciente" do auto-agendamento online da Clínica Salvus. A busca no Feegow utilizará como chave primária o **Telefone** (celular). Caso o número não seja localizado no Feegow (devido a digitação incorreta ou cadastro antigo), o sistema exibirá uma transição para busca por **CPF**.

---

## 2. Requisitos Funcionais

1. **Prioridade de Busca:** A primeira busca deve ser efetuada via `telefone` na API do Feegow (`GET /patient/list?telefone=...`).
2. **Fallback Transparente por CPF:** Se a busca por telefone retornar 0 resultados, a interface do usuário exibe uma notificação amigável e habilita o campo de entrada do **CPF**.
3. **Busca Secundária por CPF:** Ao informar o CPF, a busca é realizada na API do Feegow via `cpf` (`GET /patient/list?cpf=...`).
4. **Preservação de Produção:** Todas as alterações devem ser implementadas e validadas em ambiente de homologação (`/admin` ou modo staging), preservando 100% o link de produção.

---

## 3. Arquitetura de Componentes

### 3.1 `services/feegow.js`
Atualizar `searchPatient` para lidar com a precedência de telefone sobre CPF:

```javascript
export async function searchPatient({ telefone, cpf }) {
  let cleanTelefone = telefone ? telefone.replace(/\D/g, '') : '';
  let cleanCpf = cpf ? cpf.replace(/\D/g, '') : '';

  if (cleanTelefone.startsWith('55') && (cleanTelefone.length === 12 || cleanTelefone.length === 13)) {
    cleanTelefone = cleanTelefone.substring(2);
  }

  // 1. Busca por Telefone
  if (cleanTelefone.length >= 10) {
    const params = new URLSearchParams();
    params.set('telefone', cleanTelefone);
    const data = await request(`/patient/list?${params}`);
    const list = data.content || [];
    if (list.length > 0 && list[0].patient_id) {
      return { patient_id: list[0].patient_id, nome: list[0].nome || '', searchType: 'phone' };
    }
  }

  // 2. Fallback por CPF (se o telefone falhou e o CPF foi fornecido)
  if (cleanCpf.length === 11) {
    const params = new URLSearchParams();
    params.set('cpf', cleanCpf);
    const data = await request(`/patient/list?${params}`);
    const list = data.content || [];
    if (list.length > 0 && list[0].patient_id) {
      return { patient_id: list[0].patient_id, nome: list[0].nome || '', searchType: 'cpf' };
    }
  }

  return null;
}
```

### 3.2 `OnlineBooking.jsx`
- Estado `searchFailedByPhone`: booleano para controlar a exibição do aviso e do campo de CPF.
- Manipulador `handleSearchPatient`:
  - Executa a busca inicial com `phone`.
  - Se retornar nulo, define `searchFailedByPhone = true` e limpa erros.
  - Se o usuário digitar o CPF e acionar a busca, executa a busca com `cpf`.

---

## 4. Testes e Validação de Homologação

1. **Cenário A (Telefone Válido):** Digitar um celular cadastrado no Feegow (ex: `11918322277`). Sistema encontra e avança direto.
2. **Cenário B (Telefone Não Cadastrado + CPF Válido):** Digitar um celular inexistente. Sistema exibe aviso de CPF. Digitar CPF cadastrado no Feegow. Sistema encontra por CPF e avança.
3. **Cenário C (Telefone Inexistente + CPF Inexistente):** Exibe mensagem para contato via WhatsApp.
