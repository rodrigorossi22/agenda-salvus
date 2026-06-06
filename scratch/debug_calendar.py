import asyncio
from playwright.async_api import async_playwright
import datetime

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Listen to console messages
        page.on("console", lambda msg: print(f"[Browser Console] {msg.type}: {msg.text}"))

        print("Navegando para a página de produção...")
        await page.goto("https://agenda-salvus.vercel.app/agendamento_online?test_mode=true")
        await page.wait_for_timeout(3000)

        print("Selecionando o procedimento Ventosaterapia...")
        await page.click("text=Ventosaterapia")
        await page.wait_for_timeout(3000)

        # Vamos simular o preenchimento do input de data nativo do calendário
        # Calculamos uma data futura que caia em um dia útil (ex: daqui a 15 dias)
        target_date = datetime.date.today() + datetime.timedelta(days=15)
        # Se cair no fim de semana, move para segunda-feira
        while target_date.weekday() in (5, 6): # 5 = Saturday, 6 = Sunday
            target_date += datetime.timedelta(days=1)
        
        target_date_str = target_date.strftime("%Y-%m-%d")
        print(f"Data futura simulada para teste: {target_date_str}")

        print("Simulando seleção de data no input do calendário...")
        # Localiza o input type=date dentro do botão Outro Dia, altera o valor e dispara o evento change
        await page.evaluate(f"document.querySelector('input[type=date]').value = '{target_date_str}'")
        await page.eval_on_selector("input[type=date]", "el => el.dispatchEvent(new Event('change', { bubbles: true }))")
        
        await page.wait_for_timeout(3000)

        # Tira print para validar se o botão correspondente à data escolhida foi adicionado na barra horizontal
        screenshot_path = "scratch/calendar_success_screenshot.png"
        await page.screenshot(path=screenshot_path)
        print(f"Screenshot de sucesso salva em {screenshot_path}")

        # Verifica se o dia do mês da data futura aparece na tela
        day_number = str(target_date.day)
        page_content = await page.content()
        if day_number in page_content:
            print(f"SUCESSO: A data {target_date.strftime('%d/%m/%Y')} foi adicionada e selecionada na barra horizontal com sucesso!")
        else:
            print("FALHA: A data selecionada no calendário não apareceu na barra horizontal.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
