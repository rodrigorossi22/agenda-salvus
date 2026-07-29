import subprocess

cwd = "/Users/rodrigorossideoliveira/Antigrativy Master/Antigravity/Feegow/Agenda Salvus"
out_path = "/Users/rodrigorossideoliveira/.gemini/antigravity/brain/6546acbc-57e7-4ee7-ad57-05ebc33ee575/scratch/monica_saturday_feegow_result.txt"

res = subprocess.run("node scratch/check_monica_saturday_feegow.js", shell=True, cwd=cwd, capture_output=True, text=True)

with open(out_path, "w", encoding="utf-8") as f:
    f.write(res.stdout + "\nSTDERR:\n" + res.stderr)

print("Check finished!")
