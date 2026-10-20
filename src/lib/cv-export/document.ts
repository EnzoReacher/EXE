import "server-only";
import { Document, Packer, Paragraph, Tab, TextRun } from "docx";

export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export async function createDocx(content: string): Promise<Uint8Array<ArrayBuffer>> {
  // Each logical line becomes an editable paragraph, including empty and trailing
  // lines. Tabs are Word tab elements; text is escaped by the library, never HTML.
  const paragraphs = content.split(/\r\n|\r|\n/).map((line) => new Paragraph({
    spacing: { before: 0, after: 0, line: 276 },
    children: line.split(/(\t)/).map((part) => new TextRun(part === "\t" ? { children: [new Tab()] } : { text: part })),
  }));
  const document = new Document({ creator: "", title: "", description: "", lastModifiedBy: "",
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [{ properties: { page: { margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } }, children: paragraphs }],
  });
  return new Uint8Array(await Packer.toBuffer(document));
}
