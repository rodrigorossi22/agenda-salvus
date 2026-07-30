# Patient Search by Phone with CPF Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement progressive patient search in `Feegow/Agenda Salvus` (Staging mode) that first queries Feegow by phone number and, if not found, prompts the user for CPF and performs a fallback search by CPF.

**Architecture:** Update `searchPatient` in `services/feegow.js` to handle phone search followed by CPF fallback, and update `OnlineBooking.jsx` UI state to display the CPF fallback input when phone search returns no results.

**Tech Stack:** React, Feegow REST API, Vitest.

---

### Task 1: Update `searchPatient` Service Function

**Files:**
- Modify: `Feegow/Agenda Salvus/src/services/feegow.js`

- [ ] **Step 1: Update `searchPatient` implementation in `feegow.js`**

Replace `searchPatient` in `Feegow/Agenda Salvus/src/services/feegow.js` with:

```javascript
export async function searchPatient({ cpf, telefone }) {
  let cleanCpf = cpf ? cpf.replace(/\D/g, '') : ''
  let cleanTelefone = telefone ? telefone.replace(/\D/g, '') : ''

  if (cleanTelefone.startsWith('55') && (cleanTelefone.length === 12 || cleanTelefone.length === 13)) {
    cleanTelefone = cleanTelefone.substring(2)
  }

  // 1. Primary Search by Phone
  if (cleanTelefone.length >= 10) {
    const params = new URLSearchParams()
    params.set('telefone', cleanTelefone)
    const data = await request(`/patient/list?${params}`)
    const list = data.content || []
    if (list.length > 0 && list[0].patient_id) {
      return {
        patient_id: list[0].patient_id,
        nome: list[0].nome || '',
        searchType: 'phone'
      }
    }
  }

  // 2. Fallback Search by CPF (if Phone failed or wasn't provided)
  if (cleanCpf.length === 11) {
    const params = new URLSearchParams()
    params.set('cpf', cleanCpf)
    const data = await request(`/patient/list?${params}`)
    const list = data.content || []
    if (list.length > 0 && list[0].patient_id) {
      return {
        patient_id: list[0].patient_id,
        nome: list[0].nome || '',
        searchType: 'cpf'
      }
    }
  }

  return null
}
```

- [ ] **Step 2: Verify `feegow.js` syntax**

Run `npx vitest run src/__tests__/OnlineBooking.test.jsx` inside `Feegow/Agenda Salvus` to verify test suite passes.

- [ ] **Step 3: Commit**

```bash
git add "Feegow/Agenda Salvus/src/services/feegow.js"
git commit -m "feat(feegow): prioritize phone search over CPF fallback in searchPatient"
```

---

### Task 2: Update `OnlineBooking.jsx` Component UI for Progressive Search

**Files:**
- Modify: `Feegow/Agenda Salvus/src/components/OnlineBooking/OnlineBooking.jsx`

- [ ] **Step 1: Add state `searchFailedByPhone` and update `handleSearchPatient`**

In `OnlineBooking.jsx`:
1. Add state `const [searchFailedByPhone, setSearchFailedByPhone] = useState(false)`
2. Update `handleSearchPatient`:

```javascript
  const handleSearchPatient = async (forceCpfSearch = false) => {
    const targetPhone = phone.trim()
    const targetCpf = cpf.replace(/\D/g, '')

    if (!forceCpfSearch && !targetPhone) {
      setErrorMessage('Por favor, preencha o campo de celular.')
      return
    }

    if (forceCpfSearch && targetCpf.length !== 11) {
      setErrorMessage('Por favor, digite um CPF válido com 11 dígitos.')
      return
    }

    setSearchingPatient(true)
    setErrorMessage(null)
    setSearchFailed(false)

    try {
      const result = await searchPatient({
        telefone: targetPhone,
        cpf: forceCpfSearch ? targetCpf : ''
      })

      if (result && result.patient_id) {
        setFoundPatientId(result.patient_id)
        setFoundPatientName(result.nome)
        setSearchFailedByPhone(false)
        await loadPatientAppointmentsHistory(result.patient_id)
        await loadPatientActiveAppointments(result.patient_id)
      } else {
        if (!forceCpfSearch) {
          setSearchFailedByPhone(true)
        } else {
          setSearchFailed(true)
        }
      }
    } catch (err) {
      console.error(err)
      setErrorMessage('Erro ao buscar cadastro. Tente novamente.')
    } finally {
      setSearchingPatient(false)
    }
  }
```

- [ ] **Step 2: Add CPF Fallback UI Banner & Input Box in "Já Sou Paciente" Section**

In `OnlineBooking.jsx`, when `isFirstTime === false` and `!foundPatientId`:
If `searchFailedByPhone === true`, display:
```jsx
{searchFailedByPhone && (
  <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3 text-left">
    <p className="text-xs text-amber-200">
      ⚠️ Não localizamos um cadastro com este número de celular. Por favor, digite seu <strong>CPF</strong> para encontrar seu cadastro:
    </p>
    <input
      type="text"
      placeholder="000.000.000-00"
      value={cpf}
      onChange={(e) => setCpf(e.target.value)}
      className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#333] focus:border-[#c5a059] text-white rounded-xl text-sm outline-none"
    />
    <button
      type="button"
      onClick={() => handleSearchPatient(true)}
      disabled={searchingPatient}
      className="w-full py-2.5 bg-[#c5a059] hover:bg-[#b08e4f] text-black font-semibold rounded-xl text-xs transition-colors cursor-pointer"
    >
      {searchingPatient ? 'Buscando por CPF...' : 'Buscar por CPF'}
    </button>
  </div>
)}
```

- [ ] **Step 3: Run Vitest & Build Check**

Run `npm run build` in `Feegow/Agenda Salvus`.

- [ ] **Step 4: Commit**

```bash
git add "Feegow/Agenda Salvus/src/components/OnlineBooking/OnlineBooking.jsx"
git commit -m "feat(ui): add CPF fallback input banner when phone search returns no results"
```
