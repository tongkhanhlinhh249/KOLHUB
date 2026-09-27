import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { DemoPanelSection } from './DemoPanelSection';

export const PHASE_3_ASSUMPTIONS = [
  'Kênh ngừng hoạt động giữ dấu nhưng ẩn khỏi tìm kiếm và hồ sơ công khai (câu hỏi 6).',
  'KOL không có tuỳ chọn ẩn khỏi tìm kiếm; email hợp tác luôn hiện (câu hỏi 7).',
  'Tìm kiếm 20 KOL/trang; không giới hạn số danh sách và số KOL mỗi danh sách; không xuất Excel (câu hỏi 9).',
  'Bộ lọc “thuộc MCN” đang ẩn vì liên kết KOL–MCN ngoài phạm vi (BR-55).',
  'Quy mô tính theo tổng người theo dõi của các kênh còn dấu: Nano < 10K · Micro 10K–100K · Mid 100K–500K · Macro 500K–1M · Mega ≥ 1M.',
  'Danh sách kênh: mỗi kênh đã xác thực (còn dấu, đang hoạt động, KOL đã duyệt) là một dòng; quy mô tính theo người theo dõi của chính kênh đó; kênh của MCN không hiện.',
  'Chỉ lưu được KOL đang hiện trong tìm kiếm; KOL đã lưu rồi mất dấu vẫn ở lại danh sách (BR-62).',
];

/** Demo panel block listing the phase-3 decisions taken where the business spec is open. */
export function Phase3AssumptionsBlock() {
  return (
    <DemoPanelSection title="Giả định" description="Các quyết định tạm thời của bản demo, chờ xác nhận.">
      <Accordion type="single" collapsible>
        <AccordionItem value="phase-3">
          <AccordionTrigger className="py-2 text-sm">Nhãn hàng/Agency (Đợt 3)</AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc space-y-1.5 pl-4 text-xs text-muted-foreground">
              {PHASE_3_ASSUMPTIONS.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </DemoPanelSection>
  );
}
