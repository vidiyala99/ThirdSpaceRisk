import { ReactNode } from "react";

/**
 * ResponsiveTable — same DOM, two layouts.
 *
 * >=900px: native <table> inside an overflow-x wrapper, sticky header.
 * <900px:  each <tr> renders as a card; each <td> shows its data-label
 *          before the cell value (CSS-only via ::before).
 *
 * Usage:
 *   <ResponsiveTable headers={["Date", "Venue", "Amount"]}>
 *     <tr>
 *       <td data-label="Date">2026-05-18</td>
 *       <td data-label="Venue">Le Bain</td>
 *       <td data-label="Amount">$12,400</td>
 *     </tr>
 *   </ResponsiveTable>
 *
 * Constraint: every <td> must carry a data-label attribute.
 */
interface ResponsiveTableProps {
  headers: ReactNode[];
  children: ReactNode;
  className?: string;
  caption?: ReactNode;
}

export function ResponsiveTable({
  headers,
  children,
  className,
  caption,
}: ResponsiveTableProps) {
  const wrapClass = className
    ? `tsr-rtable-wrap ${className}`
    : "tsr-rtable-wrap";
  return (
    <div className={wrapClass}>
      <table className="tsr-rtable">
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
