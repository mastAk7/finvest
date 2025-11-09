import React, { useState, useEffect } from 'react';

function InvestorCards() {
  const [pitches, setPitches] = useState([]);
  const [selectedPitch, setSelectedPitch] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newBid, setNewBid] = useState({
    principal: '',
    interestAnnualPct: '',
    tenureMonths: 12
  });

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

  const fetchPitches = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/pitch/list`, {
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch pitches');
      }

      const data = await response.json();
      const pitchArray = Array.isArray(data.pitches) ? data.pitches : [];
      setPitches(pitchArray);
    } catch (err) {
      console.error('Error fetching pitches:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBids = async (pitchId) => {
    try {
      const response = await fetch(`${API_BASE}/bids/${pitchId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bids');
      }

      const data = await response.json();
      setBids(data.bids || []);
    } catch (err) {
      console.error('Error fetching bids:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchPitches();
  }, []);

  useEffect(() => {
    if (selectedPitch?._id) {
      fetchBids(selectedPitch._id);
    }
  }, [selectedPitch]);

  const handlePitchSelect = (pitch) => {
    setSelectedPitch(pitch);
  };

  const handleBidSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPitch) return;

    try {
      const response = await fetch(`${API_BASE}/bids/${selectedPitch._id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newBid)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit bid');
      }

      // Reset form and refresh bids
      setNewBid({ principal: '', interestAnnualPct: '', tenureMonths: 12 });
      fetchBids(selectedPitch._id);
    } catch (err) {
      console.error('Error submitting bid:', err);
      setError(err.message);
    }
  };

  const handleAcceptBid = async (bidId) => {
    try {
      const response = await fetch(`${API_BASE}/bids/${bidId}/accept`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to accept bid');
      }

      // Refresh bids
      fetchBids(selectedPitch._id);
    } catch (err) {
      console.error('Error accepting bid:', err);
      setError(err.message);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div className="grid grid-cols-3 gap-4 p-4">
      {/* Left column - Pitch List */}
      <div className="col-span-1 space-y-4">
        <h2 className="text-xl font-bold mb-4">Active Loan Requests</h2>
        {pitches.map((pitch) => (
          <div
            key={pitch._id}
            className={`p-4 rounded-lg shadow cursor-pointer transition-colors ${
              selectedPitch?._id === pitch._id 
                ? 'bg-blue-50 border-2 border-blue-500'
                : 'bg-white hover:bg-gray-50'
            }`}
            onClick={() => handlePitchSelect(pitch)}
          >
            <div className="flex justify-between items-start mb-2">
              <span className={`px-2 py-1 rounded text-sm font-medium ${
                pitch.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                pitch.status === 'approved' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {pitch.status.charAt(0).toUpperCase() + pitch.status.slice(1)}
              </span>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2">{pitch.professionalPitch}</p>
            <div className="mt-2 text-sm text-gray-500">
              Amount: {pitch.extractedInfo.loanAmount}
            </div>
          </div>
        ))}
      </div>

      {/* Right column - Selected Pitch Details & Bids */}
      <div className="col-span-2">
        {selectedPitch ? (
          <div className="space-y-6">
            {/* Pitch Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Pitch Details</h3>
              <p className="text-gray-700 mb-4">{selectedPitch.professionalPitch}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Loan Amount: </span>
                  <span className="font-medium">{selectedPitch.extractedInfo.loanAmount}</span>
                </div>
                <div>
                  <span className="text-gray-500">Business Type: </span>
                  <span className="font-medium">{selectedPitch.extractedInfo.businessType}</span>
                </div>
                <div>
                  <span className="text-gray-500">Purpose: </span>
                  <span className="font-medium">{selectedPitch.extractedInfo.purpose}</span>
                </div>
              </div>
            </div>

            {/* Submit Bid Form */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Submit Your Bid</h3>
              <form onSubmit={handleBidSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Principal Amount</label>
                    <input
                      type="number"
                      value={newBid.principal}
                      onChange={(e) => setNewBid(prev => ({ ...prev, principal: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Interest Rate (%)</label>
                    <input
                      type="number"
                      value={newBid.interestAnnualPct}
                      onChange={(e) => setNewBid(prev => ({ ...prev, interestAnnualPct: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tenure (Months)</label>
                    <select
                      value={newBid.tenureMonths}
                      onChange={(e) => setNewBid(prev => ({ ...prev, tenureMonths: Number(e.target.value) }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value={12}>12 months</option>
                      <option value={24}>24 months</option>
                      <option value={36}>36 months</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Submit Bid
                </button>
              </form>
            </div>

            {/* Bids List */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">All Bids</h3>
              {bids.length === 0 ? (
                <p className="text-gray-500">No bids yet</p>
              ) : (
                <div className="space-y-4">
                  {bids.map((bid) => (
                    <div key={bid._id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{bid.investor.name}</p>
                          <div className="mt-1 text-sm text-gray-600">
                            <p>Principal: ₹{bid.principal}</p>
                            <p>Interest: {bid.interestAnnualPct}%</p>
                            <p>Tenure: {bid.tenureMonths} months</p>
                            {bid.compositeScore !== undefined && (
                              <p className="text-blue-600">Score: {(bid.compositeScore * 100).toFixed(1)}</p>
                            )}
                          </div>
                        </div>
                        <div>
                          {bid.status === 'pending' ? (
                            <button
                              onClick={() => handleAcceptBid(bid._id)}
                              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Accept Bid
                            </button>
                          ) : (
                            <span className={`px-3 py-1 rounded-full text-sm ${
                              bid.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Select a pitch to view details
          </div>
        )}
      </div>
    </div>
  );
}

export default InvestorCards;