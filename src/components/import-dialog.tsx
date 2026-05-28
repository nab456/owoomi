'use client';
import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileDown, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Column { key: string; label: string; required?: boolean; type?: 'number' | 'string'; }

interface ImportResult {
  success: number;
  errors: { row: number; message: string }[];
}

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  columns: Column[];
  onImport: (rows: Record<string, any>[]) => Promise<ImportResult>;
  templateFileName: string;
}

export function ImportDialog({ open, onOpenChange, title, columns, onImport, templateFileName }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, any>[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [parseError, setParseError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null); setPreview([]); setResult(null); setParseError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      columns.reduce((acc, c) => ({ ...acc, [c.label]: c.type === 'number' ? 0 : '' }), {})
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, templateFileName);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setParseError('');
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows: any[] = XLSX.utils.sheet_to_json(ws);

        const mapped = rawRows.map(row => {
          const result: Record<string, any> = {};
          columns.forEach(col => {
            const val = row[col.label] ?? row[col.key] ?? '';
            result[col.key] = col.type === 'number' ? (parseFloat(val) || 0) : String(val ?? '').trim();
          });
          return result;
        }).filter(row => columns.some(c => c.required && row[c.key]));

        setPreview(mapped.slice(0, 5));
        if (mapped.length === 0) setParseError('Aucune ligne valide trouvée. Vérifiez les colonnes.');
        else setFile(f);
        // Store full data for import
        (f as any)._parsed = mapped;
      } catch {
        setParseError('Fichier illisible. Utilisez le format Excel (.xlsx) ou CSV.');
      }
    };
    reader.readAsArrayBuffer(f);
  };

  const handleImport = async () => {
    if (!file || !(file as any)._parsed) return;
    setImporting(true);
    try {
      const res = await onImport((file as any)._parsed);
      setResult(res);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <FileDown className="h-4 w-4 mr-2" />Télécharger le modèle Excel
            </Button>
            <span className="text-xs text-muted-foreground">Colonnes : {columns.map(c => c.label).join(', ')}</span>
          </div>

          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">{file ? file.name : 'Cliquez ou glissez un fichier Excel / CSV'}</p>
            <p className="text-xs text-muted-foreground mt-1">.xlsx, .xls, .csv acceptés</p>
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
          </div>

          {parseError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded p-3">
              <XCircle className="h-4 w-4 shrink-0" />{parseError}
            </div>
          )}

          {preview.length > 0 && !result && (
            <div>
              <p className="text-sm font-medium mb-2">Aperçu (5 premières lignes)</p>
              <div className="border rounded overflow-x-auto">
                <table className="text-xs w-full">
                  <thead className="bg-muted">
                    <tr>{columns.map(c => <th key={c.key} className="px-2 py-1 text-left font-medium">{c.label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t">
                        {columns.map(c => <td key={c.key} className="px-2 py-1 truncate max-w-[120px]">{row[c.key]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{(file as any)._parsed?.length ?? 0} lignes détectées</p>
            </div>
          )}

          {result && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded p-3">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <strong>{result.success} ligne(s) importée(s) avec succès.</strong>
              </div>
              {result.errors.length > 0 && (
                <div className="bg-yellow-50 rounded p-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-yellow-800">
                    <AlertCircle className="h-4 w-4" />{result.errors.length} erreur(s)
                  </div>
                  {result.errors.slice(0, 5).map((e, i) => (
                    <p key={i} className="text-xs text-yellow-700">Ligne {e.row}: {e.message}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Fermer</Button></DialogClose>
          {!result && preview.length > 0 && (
            <Button onClick={handleImport} disabled={importing} className="bg-green-600 hover:bg-green-700 text-white">
              {importing ? 'Importation...' : `Importer ${(file as any)?._parsed?.length ?? 0} lignes`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
