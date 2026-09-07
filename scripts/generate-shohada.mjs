import fs from "fs";
import path from "path";

const names = JSON.parse(fs.readFileSync("src/lib/data/shohada-shahidieh.json", "utf8"));

const code = `import { MartyrProfile } from "@/types/campaign";

export const SHOHADA_SHAHIDIEH_NAMES: string[] = ${JSON.stringify(names, null, 2)};

export function getShahidiehMartyrProfiles(): MartyrProfile[] {
  return SHOHADA_SHAHIDIEH_NAMES.map((name, i) => {
    const isSardar = name.includes("سردار");
    const formattedName = isSardar
      ? "سردار شهید " + name.replace("سردار", "").trim()
      : "شهید " + name;

    return {
      id: "martyr-sh-" + (i + 1),
      name: formattedName,
      title: isSardar ? "فرمانده و سردار سرافراز دیار شهیدیه" : "از شهدای والامقام دیار شهیدیه",
      photoUrl: "/images/martyrs/tulip-avatar.svg",
      biography:
        "از شهدای والامقام و سلحشور دیار شهیدیه که در دوران دفاع مقدس با اخلاص و شجاعت از حریم ایران اسلامی دفاع کرده و به فیض عظمای شهادت نائل آمدند.",
      quote: "«راه سرخ شهادت، مسیر جاودانگی، ایثار و عزت است.»",
    };
  });
}
`;

fs.writeFileSync("src/lib/data/shohada-shahidieh.ts", code, "utf8");
console.log("Successfully generated src/lib/data/shohada-shahidieh.ts with", names.length, "martyrs");
