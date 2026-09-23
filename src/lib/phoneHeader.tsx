import React, { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';

/**
 * The spot in a phone's fixed header where a page can put a control of its own
 * — Statistics' reorder toggle — beside the app's sync and add buttons.
 *
 * A portal target rather than state lifted into the layout: a page handing the
 * layout a new element on every render would re-render the layout, which
 * re-renders the page, which hands it another. Rendering into a node the layout
 * owns has no such loop.
 */
export const PhoneHeaderContext = createContext<HTMLElement | null>(null);

/** Renders its children in the phone header, and nowhere on a wider screen. */
export const PhoneHeaderAction: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const target = useContext(PhoneHeaderContext);
  return target ? createPortal(children, target) : null;
};
