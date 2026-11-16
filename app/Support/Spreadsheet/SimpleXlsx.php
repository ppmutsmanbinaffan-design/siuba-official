<?php

namespace App\Support\Spreadsheet;

use RuntimeException;
use ZipArchive;

/**
 * Pembaca & penulis file Excel (.xlsx) minimal tanpa dependensi tambahan.
 *
 * - read(): mengambil sheet pertama sebagai array baris (array of string), mendukung shared strings,
 *   inline string, angka, boolean, rumus (nilai hasil tersimpan) dan tanggal (dikonversi ke Y-m-d).
 * - write(): membuat workbook satu sheet dengan seluruh sel berformat Teks (@) agar NIS, NISN,
 *   No HP, dan UID RFID tidak kehilangan angka 0 di depan saat diisi di Excel.
 *
 * Hanya membutuhkan ekstensi PHP `zip` (aktif secara bawaan di XAMPP).
 */
class SimpleXlsx
{
    public const MAX_ROWS = 20000;

    private const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    private const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    private const NS_PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';

    /** Built-in number format id yang berupa tanggal/waktu. */
    private const DATE_FORMAT_IDS = [14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 30, 36, 45, 46, 47, 50, 57];

    public static function isXlsxFile(string $path, ?string $originalName = null): bool
    {
        if ($originalName !== null && preg_match('/\.(xlsx|xlsm)$/i', $originalName)) {
            return true;
        }
        $fh = @fopen($path, 'rb');
        if (!$fh) {
            return false;
        }
        $magic = fread($fh, 4);
        fclose($fh);

        return $magic === "PK\x03\x04";
    }

    public static function isAvailable(): bool
    {
        return class_exists(ZipArchive::class);
    }

    /**
     * @return array<int, array<int, string>>
     */
    public static function read(string $path): array
    {
        if (!self::isAvailable()) {
            throw new RuntimeException('Ekstensi PHP "zip" belum aktif. Aktifkan extension=zip di php.ini atau simpan file sebagai CSV.');
        }

        $zip = new ZipArchive();
        if ($zip->open($path) !== true) {
            throw new RuntimeException('File Excel tidak dapat dibuka. Pastikan formatnya .xlsx (bukan .xls lama).');
        }

        try {
            $sheetPath = self::firstSheetPath($zip);
            $sharedStrings = self::readSharedStrings($zip);
            $dateStyles = self::readDateStyles($zip);
            $date1904 = self::usesDate1904($zip);

            $xml = $zip->getFromName($sheetPath);
            if ($xml === false) {
                throw new RuntimeException('Sheet pertama pada file Excel tidak ditemukan.');
            }

            return self::parseSheet($xml, $sharedStrings, $dateStyles, $date1904);
        } finally {
            $zip->close();
        }
    }

    /**
     * Ubah baris ke teks CSV (koma) supaya bisa diproses parser CSV yang sudah ada.
     *
     * @param array<int, array<int, string>> $rows
     */
    public static function rowsToCsv(array $rows): string
    {
        $out = fopen('php://temp', 'r+');
        foreach ($rows as $row) {
            // Parser CSV memecah per baris, jadi baris-baru di dalam sel diganti spasi.
            $clean = array_map(fn ($v) => trim(preg_replace('/\s*[\r\n]+\s*/', ' ', (string) $v)), $row);
            if (count(array_filter($clean, fn ($v) => $v !== '')) === 0) {
                continue;
            }
            fputcsv($out, $clean);
        }
        rewind($out);
        $csv = (string) stream_get_contents($out);
        fclose($out);

        return $csv;
    }

    /**
     * @param array<int, string> $headers
     * @param array<int, array<int, string>> $rows
     */
    public static function write(array $headers, array $rows, string $sheetName = 'Data'): string
    {
        if (!self::isAvailable()) {
            throw new RuntimeException('Ekstensi PHP "zip" belum aktif.');
        }

        $tmp = tempnam(sys_get_temp_dir(), 'xlsx');
        $zip = new ZipArchive();
        $zip->open($tmp, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        $colCount = max(count($headers), ...array_map('count', $rows ?: [[]]));
        $lastCol = self::columnLetter(max(1, $colCount) - 1);

        $sheetRows = '';
        $all = array_merge([$headers], $rows);
        foreach ($all as $r => $row) {
            $rowNum = $r + 1;
            $style = $r === 0 ? 1 : 2;
            $cells = '';
            foreach (array_values($row) as $c => $value) {
                $ref = self::columnLetter($c) . $rowNum;
                $cells .= '<c r="' . $ref . '" t="inlineStr" s="' . $style . '"><is><t xml:space="preserve">'
                    . self::xml((string) $value) . '</t></is></c>';
            }
            $sheetRows .= '<row r="' . $rowNum . '">' . $cells . '</row>';
        }

        $cols = '';
        for ($c = 0; $c < $colCount; $c++) {
            $width = max(12, min(45, mb_strlen((string) ($headers[$c] ?? '')) + 4));
            // style 2 = teks, juga untuk sel kosong di kolom ini
            $cols .= '<col min="' . ($c + 1) . '" max="' . ($c + 1) . '" width="' . $width . '" style="2" customWidth="1"/>';
        }

        $zip->addFromString('[Content_Types].xml',
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            . '<Default Extension="xml" ContentType="application/xml"/>'
            . '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            . '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            . '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            . '</Types>');
        $zip->addFromString('_rels/.rels',
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="' . self::NS_PKG_REL . '">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            . '</Relationships>');
        $zip->addFromString('xl/workbook.xml',
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<workbook xmlns="' . self::NS_MAIN . '" xmlns:r="' . self::NS_REL . '">'
            . '<sheets><sheet name="' . self::xml(mb_substr($sheetName, 0, 31)) . '" sheetId="1" r:id="rId1"/></sheets>'
            . '</workbook>');
        $zip->addFromString('xl/_rels/workbook.xml.rels',
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="' . self::NS_PKG_REL . '">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            . '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            . '</Relationships>');
        $zip->addFromString('xl/styles.xml',
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<styleSheet xmlns="' . self::NS_MAIN . '">'
            . '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>'
            . '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
            . '<fill><patternFill patternType="solid"><fgColor rgb="FF1F5C45"/><bgColor indexed="64"/></patternFill></fill></fills>'
            . '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
            . '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            . '<cellXfs count="3">'
            . '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
            . '<xf numFmtId="49" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyNumberFormat="1"/>'
            . '<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
            . '</cellXfs>'
            . '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
            . '</styleSheet>');
        $zip->addFromString('xl/worksheets/sheet1.xml',
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<worksheet xmlns="' . self::NS_MAIN . '" xmlns:r="' . self::NS_REL . '">'
            . '<dimension ref="A1:' . $lastCol . count($all) . '"/>'
            . '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
            . '<cols>' . $cols . '</cols>'
            . '<sheetData>' . $sheetRows . '</sheetData>'
            . '</worksheet>');
        $zip->close();

        $binary = (string) file_get_contents($tmp);
        @unlink($tmp);

        return $binary;
    }

    // ------------------------------------------------------------------ internals

    private static function firstSheetPath(ZipArchive $zip): string
    {
        $workbook = $zip->getFromName('xl/workbook.xml');
        $rels = $zip->getFromName('xl/_rels/workbook.xml.rels');
        if ($workbook !== false && $rels !== false) {
            $wb = self::loadXml($workbook);
            $rl = self::loadXml($rels);
            if ($wb && $rl) {
                $wb->registerXPathNamespace('m', self::NS_MAIN);
                $sheets = $wb->xpath('//m:sheets/m:sheet');
                if (!empty($sheets)) {
                    $rid = (string) ($sheets[0]->attributes(self::NS_REL)['id'] ?? '');
                    foreach ($rl->children() as $rel) {
                        if ((string) self::attr($rel, 'Id') === $rid) {
                            $target = ltrim((string) self::attr($rel, 'Target'), '/');
                            return str_starts_with($target, 'xl/') ? $target : 'xl/' . $target;
                        }
                    }
                }
            }
        }
        if ($zip->locateName('xl/worksheets/sheet1.xml') !== false) {
            return 'xl/worksheets/sheet1.xml';
        }
        throw new RuntimeException('File bukan workbook Excel (.xlsx) yang valid.');
    }

    /** @return array<int, string> */
    private static function readSharedStrings(ZipArchive $zip): array
    {
        $xml = $zip->getFromName('xl/sharedStrings.xml');
        if ($xml === false) {
            return [];
        }
        $doc = self::loadXml($xml);
        if (!$doc) {
            return [];
        }
        $out = [];
        foreach ($doc->children(self::NS_MAIN) as $si) {
            $out[] = self::richText($si);
        }

        return $out;
    }

    /** @return array<int, bool> style index => is date */
    private static function readDateStyles(ZipArchive $zip): array
    {
        $xml = $zip->getFromName('xl/styles.xml');
        if ($xml === false) {
            return [];
        }
        $doc = self::loadXml($xml);
        if (!$doc) {
            return [];
        }
        $doc->registerXPathNamespace('m', self::NS_MAIN);
        $customDate = [];
        foreach ($doc->xpath('//m:numFmts/m:numFmt') ?: [] as $fmt) {
            $code = strtolower(preg_replace('/"[^"]*"|\[[^\]]*\]/', '', (string) self::attr($fmt, 'formatCode')));
            if (preg_match('/[dy]|m{1,4}(?![a-z])/', $code) && !preg_match('/^[#0.,%\s]+$/', $code)) {
                $customDate[(int) self::attr($fmt, 'numFmtId')] = true;
            }
        }
        $out = [];
        $xfs = $doc->xpath('//m:cellXfs/m:xf') ?: [];
        foreach ($xfs as $i => $xf) {
            $id = (int) self::attr($xf, 'numFmtId');
            $out[$i] = in_array($id, self::DATE_FORMAT_IDS, true) || isset($customDate[$id]);
        }

        return $out;
    }

    private static function usesDate1904(ZipArchive $zip): bool
    {
        $xml = $zip->getFromName('xl/workbook.xml');

        return $xml !== false && preg_match('/date1904="(1|true)"/i', $xml) === 1;
    }

    /**
     * @param array<int,string> $shared
     * @param array<int,bool> $dateStyles
     * @return array<int, array<int, string>>
     */
    private static function parseSheet(string $xml, array $shared, array $dateStyles, bool $date1904): array
    {
        $doc = self::loadXml($xml);
        if (!$doc) {
            throw new RuntimeException('Isi sheet Excel tidak dapat dibaca.');
        }
        $data = $doc->children(self::NS_MAIN)->sheetData;
        $rows = [];
        $count = 0;
        foreach ($data->children(self::NS_MAIN) as $row) {
            if (++$count > self::MAX_ROWS) {
                throw new RuntimeException('File terlalu besar (maksimal ' . self::MAX_ROWS . ' baris per import).');
            }
            $line = [];
            $nextCol = 0;
            foreach ($row->children(self::NS_MAIN) as $c) {
                $ref = (string) self::attr($c, 'r');
                $col = $ref !== '' ? self::columnIndex($ref) : $nextCol;
                $nextCol = $col + 1;
                $line[$col] = self::cellValue($c, $shared, $dateStyles, $date1904);
            }
            if ($line === []) {
                continue;
            }
            $max = max(array_keys($line));
            $dense = [];
            for ($i = 0; $i <= $max; $i++) {
                $dense[] = $line[$i] ?? '';
            }
            $rows[] = $dense;
        }

        return $rows;
    }

    private static function cellValue(\SimpleXMLElement $c, array $shared, array $dateStyles, bool $date1904): string
    {
        $type = (string) self::attr($c, 't');
        $ns = $c->children(self::NS_MAIN);
        $v = isset($ns->v) ? (string) $ns->v : '';

        switch ($type) {
            case 's':
                return $shared[(int) $v] ?? '';
            case 'inlineStr':
                return isset($ns->is) ? self::richText($ns->is) : '';
            case 'b':
                return $v === '1' ? 'TRUE' : 'FALSE';
            case 'str':
            case 'e':
                return $v;
        }

        if ($v === '') {
            return '';
        }
        $style = (int) self::attr($c, 's');
        if (!empty($dateStyles[$style]) && is_numeric($v)) {
            return self::excelDate((float) $v, $date1904);
        }

        return self::normalizeNumber($v);
    }

    /** Angka besar seperti 6281234567890 sering tersimpan "6.28123456789E+12" — kembalikan ke digit penuh. */
    private static function normalizeNumber(string $v): string
    {
        if (preg_match('/^-?\d+(\.\d+)?E[+-]?\d+$/i', $v)) {
            $f = (float) $v;
            if (abs($f) >= 1 && floor($f) == $f && abs($f) < 1e18) {
                return sprintf('%.0f', $f);
            }
            return rtrim(rtrim(sprintf('%.10F', $f), '0'), '.');
        }
        if (preg_match('/^-?\d+\.\d+$/', $v)) {
            // buang noise floating point (0.30000000000000004)
            return rtrim(rtrim(number_format((float) $v, 10, '.', ''), '0'), '.');
        }

        return $v;
    }

    private static function excelDate(float $serial, bool $date1904): string
    {
        $days = (int) floor($serial);
        $seconds = (int) round(($serial - $days) * 86400);
        $base = $date1904 ? 24107 : 25569; // hari dari epoch Excel ke 1970-01-01
        $ts = ($days - $base) * 86400 + $seconds;
        $fmt = $seconds > 0 ? ($days > 0 ? 'Y-m-d H:i:s' : 'H:i:s') : 'Y-m-d';

        return gmdate($fmt, $ts);
    }

    private static function richText(\SimpleXMLElement $node): string
    {
        $ns = $node->children(self::NS_MAIN);
        if (isset($ns->t)) {
            return (string) $ns->t;
        }
        $text = '';
        foreach ($ns->r as $run) {
            $text .= (string) $run->children(self::NS_MAIN)->t;
        }

        return $text;
    }

    private static function attr(\SimpleXMLElement $el, string $name): string
    {
        $attrs = $el->attributes();

        return isset($attrs[$name]) ? (string) $attrs[$name] : '';
    }

    private static function loadXml(string $xml): ?\SimpleXMLElement
    {
        $prev = libxml_use_internal_errors(true);
        // LIBXML_NONET: tidak mengambil entitas dari jaringan
        $doc = simplexml_load_string($xml, \SimpleXMLElement::class, LIBXML_NONET | LIBXML_COMPACT);
        libxml_clear_errors();
        libxml_use_internal_errors($prev);

        return $doc === false ? null : $doc;
    }

    private static function columnIndex(string $ref): int
    {
        preg_match('/^([A-Z]+)/i', $ref, $m);
        $letters = strtoupper($m[1] ?? 'A');
        $n = 0;
        for ($i = 0; $i < strlen($letters); $i++) {
            $n = $n * 26 + (ord($letters[$i]) - 64);
        }

        return $n - 1;
    }

    private static function columnLetter(int $index): string
    {
        $s = '';
        $index++;
        while ($index > 0) {
            $mod = ($index - 1) % 26;
            $s = chr(65 + $mod) . $s;
            $index = intdiv($index - $mod - 1, 26);
        }

        return $s;
    }

    private static function xml(string $s): string
    {
        $s = preg_replace('/[^\x{9}\x{A}\x{D}\x{20}-\x{D7FF}\x{E000}-\x{FFFD}]/u', '', $s) ?? '';

        return htmlspecialchars($s, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }
}
