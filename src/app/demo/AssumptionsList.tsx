import { ASSUMPTIONS } from './assumptions';
import { DemoPanelSection } from './DemoPanelSection';

/** Demo Panel block "Giả định": open questions and the decision taken for the prototype. */
export function AssumptionsList() {
  return (
    <DemoPanelSection title="Giả định (chờ khách xác nhận)">
      <dl className="space-y-2.5">
        {ASSUMPTIONS.map((a) => (
          <div key={a.question} className="space-y-0.5 text-xs">
            <dt className="font-medium text-foreground">{a.question}</dt>
            <dd className="text-muted-foreground">{a.decision}</dd>
          </div>
        ))}
      </dl>
    </DemoPanelSection>
  );
}
