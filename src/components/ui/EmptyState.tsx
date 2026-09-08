import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="mx-auto max-w-md space-y-3 rounded-lg border border-dashed border-gray-300 bg-gray-75/60 p-10 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-gray-200 text-gray-700">
      {icon}
    </div>
    <h3 className="text-200 font-bold text-gray-1000">{title}</h3>
    <p className="text-75 text-gray-700">{description}</p>
    {action ? <div className="flex justify-center pt-1">{action}</div> : null}
  </div>
);
