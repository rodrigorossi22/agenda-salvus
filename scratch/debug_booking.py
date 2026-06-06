import asyncio
from playwright.async_api import async_playwright
import time

async def main():
    async with async_playwright() as p:
        # Launch browser headless
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Listen to console messages
        page.on("console", lambda msg: print(f"[Browser Console] {msg.type}: {msg.text}"))

        # Listen to network requests & responses
        def is_api(url):
            return "api" in url

        page.on("request", lambda req: print(f"[Network Request] {req.method} {req.url}") if is_api(req.url) else None)

        async def handle_response(response):
            if is_api(response.url):
                print(f"[Network Response] {response.status} {response.url}")
                if response.status >= 400 or response.request.method != "GET":
                    try:
                        body = await response.text()
                        print(f"[Network Response Body] {response.url} -> {body}")
                    except Exception:
                        pass

        page.on("response", lambda res: asyncio.create_task(handle_response(res)))

        print("Navegando para a página de agendamento...")
        # NOTA: Como ainda não fizemos deploy para produção na Vercel (agenda-salvus.vercel.app),
        # nós podemos rodar o servidor local e testar localmente, OU podemos usar o vercel dev.
        # Mas para testar de forma simples o comportamento do código que acabamos de alterar localmente,
        # vamos levantar temporariamente um servidor de preview local para que o Playwright acesse.
        # Por enquanto, o script vai apontar para http://localhost:5173 e nós levantamos o dev server no comando.
        await page.goto("http://localhost:5173/agendamento_online?test_mode=true")
        await page.wait_for_timeout(3000)

        print("Selecionando o procedimento Ventosaterapia...")
        await page.click("text=Ventosaterapia")
        await page.wait_for_timeout(2000)

        print("Selecionando o dia de amanhã...")
        day_buttons = await page.query_selector_all(".flex-shrink-0")
        if len(day_buttons) > 1:
            await day_buttons[1].click()
            print("Dia de amanhã selecionado.")
            await page.wait_for_timeout(2000)

        print("Selecionando o primeiro horário disponível...")
        buttons = await page.query_selector_all("button")
        time_button = None
        for btn in buttons:
            text = await btn.inner_text()
            if text and len(text) == 5 and ":" in text:
                time_button = btn
                print(f"Horário encontrado: {text}")
                break

        if not time_button:
            print("Nenhum horário disponível encontrado! Abortando.")
            await browser.close()
            return

        await time_button.click()
        await page.wait_for_timeout(2000)

        print("Preenchendo o formulário com os dados de Patricia...")
        await page.fill("input[placeholder='Digite seu nome completo']", "Patricia Cordeiro Mota")
        await page.fill("input[placeholder='Apenas números (11 dígitos)']", "045.358.774-74")
        await page.fill("input[placeholder='DD/MM/AAAA']", "23/11/1984")
        await page.fill("input[placeholder='seu.email@exemplo.com']", "patmota1@hotmail.com")
        await page.fill("input[placeholder='(DD) 99999-9999']", "11 99478-0808")

        print("Esperando 1 segundo...")
        await page.wait_for_timeout(1000)

        print("Clicando no botão 'Confirmar Agendamento'...")
        await page.click("button:has-text('Confirmar Agendamento')")
        
        # Espera 5 segundos para que as requisições aconteçam e o erro apareça na tela
        await page.wait_for_timeout(5000)

        # Tira print do formulário com a mensagem de erro visível
        await page.screenshot(path="scratch/error_rendered_screenshot.png")
        print("Screenshot salva em scratch/error_rendered_screenshot.png")

        # Verifica se o texto do erro está presente na página
        page_content = await page.content()
        if "Feegow" in page_content or "invalido" in page_content:
            print("SUCESSO: A mensagem de erro da Feegow está visível no HTML!")
        else:
            print("FALHA: A mensagem de erro da Feegow NÃO foi encontrada no HTML.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
