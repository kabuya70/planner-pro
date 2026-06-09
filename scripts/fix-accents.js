const fs = require("fs");
const path = require("path");

const roots = ["app", "components", "lib", "hooks", "utils"];

const extensions = new Set([".tsx", ".ts", ".jsx", ".js", ".css"]);

const replacements = [
  ["Ã©", "é"],
  ["Ã¨", "è"],
  ["Ãª", "ê"],
  ["Ã«", "ë"],
  ["Ã ", "à"],
  ["Ã¢", "â"],
  ["Ã¤", "ä"],
  ["Ã®", "î"],
  ["Ã¯", "ï"],
  ["Ã´", "ô"],
  ["Ã¶", "ö"],
  ["Ã¹", "ù"],
  ["Ã»", "û"],
  ["Ã¼", "ü"],
  ["Ã§", "ç"],
  ["Ã‰", "É"],
  ["Ãˆ", "È"],
  ["ÃŠ", "Ê"],
  ["Ã€", "À"],
  ["Ã‡", "Ç"],
  ["Â°", "°"],
  ["Â·", "·"],
  ["Â«", "«"],
  ["Â»", "»"],
  ["Â", ""],
  ["â€™", "'"],
  ["â€˜", "'"],
  ["â€œ", '"'],
  ["â€", '"'],
  ["â€“", "–"],
  ["â€”", "—"],
  ["â€¦", "..."],
  ["â†’", "→"],
  ["âœ“", "✓"],
  ["âœ…", "✅"],
  ["â­", "⭐"],
  ["�", "é"],

  ["A faire", "À faire"],
  ["A venir", "À venir"],
  ["Termine", "Terminé"],
  ["termine", "terminé"],
  ["terminee", "terminée"],
  ["terminees", "terminées"],

  ["Tache", "Tâche"],
  ["Taches", "Tâches"],
  ["tache", "tâche"],
  ["taches", "tâches"],
  ["sous-taches", "sous-tâches"],
  ["Sous-taches", "Sous-tâches"],

  ["Gerer", "Gérer"],
  ["gerer", "gérer"],
  ["Avancement reel", "Avancement réel"],
  ["Prevu", "Prévu"],
  ["prevu", "prévu"],
  ["lancees", "lancées"],
  ["finalisees", "finalisées"],
  ["validee", "validée"],
  ["validees", "validées"],

  ["element", "élément"],
  ["elements", "éléments"],
  ["definie", "définie"],
  ["debut", "début"],
  ["echeance", "échéance"],
  ["echeances", "échéances"],

  ["Creer", "Créer"],
  ["cree", "crée"],
  ["Cree", "Crée"],
  ["Decris", "Décris"],
  ["revisions", "révisions"],
  ["controle", "contrôle"],

  ["Categorie", "Catégorie"],
  ["Etudes", "Études"],
  ["Annee", "Année"],
  ["Fevrier", "Février"],
  ["Aout", "Août"],
  ["evenement", "événement"],
  ["evenements", "événements"],
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  let files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files = files.concat(walk(full));
    } else if (extensions.has(path.extname(entry.name))) {
      files.push(full);
    }
  }

  return files;
}

let changedFiles = 0;

for (const root of roots) {
  const files = walk(root);

  for (const file of files) {
    let content = fs.readFileSync(file, "utf8");
    const original = content;

    for (const [bad, good] of replacements) {
      content = content.split(bad).join(good);
    }

    if (content !== original) {
      fs.writeFileSync(file, content, "utf8");
      changedFiles++;
      console.log("Corrigé :", file);
    }
  }
}

console.log(`Correction terminée. Fichiers modifiés : ${changedFiles}`);
