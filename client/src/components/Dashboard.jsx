import React from 'react';
import BorrowerCards from './BorrowerCards';
import InvestorCards from './InvestorCards';

function Dashboard({ mode, account }) {
  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">
        {mode === 'investor' ? 'Investment Opportunities' : 'Your Loan Requests'}
      </h1>

      {mode === 'investor' ? (
        // Investor View
        <InvestorCards />
      ) : (
        // Borrower View
        <div>
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Create New Pitch</h2>
            <BorrowerCards />
          </div>
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Your Pitches</h2>
            {/* Show borrower's own pitches */}
            <BorrowerCards viewOnly />
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;