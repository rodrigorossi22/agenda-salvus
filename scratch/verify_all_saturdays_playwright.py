import asyncio
from playwright.async_api import async_playwright
import json

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()

        errors = []
        console_logs = []

        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda exc: errors.append(str(exc)))

        url = "https://agenda-salvus.vercel.app/agendamento_online"
        base = "/Users/rodrigorossideoliveira/.gemini/antigravity/brain/6546acbc-57e7-4ee7-ad57-05ebc33ee575/scratch"

        print("Navegando para o agendamento online...")
        await page.goto(url, wait_until="networkidle", timeout=20000)
        await page.wait_for_timeout(1000)

        await page.get_by_text("Primeira vez na clínica").click()
        await page.wait_for_timeout(1000)
        await page.get_by_text("Agendar por Data").click()
        await page.wait_for_timeout(2000)

        # 1. Test Sábado 01/08/2026 (Mônica Solo)
        date_input = page.locator('input[type="date"]')
        if await date_input.count() > 0:
            await date_input.fill("2026-08-01")
            await date_input.evaluate("el => el.dispatchEvent(new Event('change', { bubbles: true }))")
            await page.wait_for_timeout(3000)

        await page.screenshot(path=f"{base}/saturday_01_08_monica_solo.png")
        slots_01_08 = await page.get_by_text("12:30").is_visible()

        # 2. Test Sábado 08/08/2026 (Feegow Dynamic)
        if await date_input.count() > 0:
            await date_input.fill("2026-08-08")
            await date_input.evaluate("el => el.dispatchEvent(new Event('change', { bubbles: true }))")
            await page.wait_for_timeout(3000)

        await page.screenshot(path=f"{base}/saturday_08_08_feegow_dynamic.png")

        with open(f"{base}/saturday_validation_report.json", "w") as f:
            json.dump({
                "slots_01_08_visible": slots_01_08,
                "errors": errors,
                "console": console_logs
            }, f, indent=2)

        print("Validação completa dos Sábados concluída!")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
