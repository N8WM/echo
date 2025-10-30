const xmlSpecial = /[<>&'"]/g;

const xmlReplacements: Record<string, string> = {
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  "'": "&apos;",
  "\"": "&quot;"
};

export const escapeCData = (value: string) =>
  value.replace(xmlSpecial, (match) => xmlReplacements[match] ?? match);
