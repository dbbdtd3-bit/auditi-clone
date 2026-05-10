'use client';

import { useEffect, useState } from 'react';

export function useModalDetector(): boolean {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    function check() {
      const open = document.querySelector(
        '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
      );
      setIsModalOpen(!!open);
    }

    check();

    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state'],
    });

    return () => observer.disconnect();
  }, []);

  return isModalOpen;
}
