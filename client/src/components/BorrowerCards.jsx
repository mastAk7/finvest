import React, { useState } from 'react';

function BorrowerCards({ onSubmit, viewOnly = false }) {
  const [slangText, setSlangText] = useState('');
  const [generatedPitch, setGeneratedPitch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

  // State for storing user's own pitches in view mode
  const [userPitches, setUserPitches] = useState([]);
  const [fetchingPitches, setFetchingPitches] = useState(false);

  // Fetch user's pitches if in view mode
  useEffect(() => {
    if (viewOnly) {
      fetchUserPitches();
    }
  }, [viewOnly]);

  const fetchUserPitches = async () => {
    try {
      setFetchingPitches(true);
      setError(null);
      
      const response = await fetch(`${API_BASE}/pitch/my-pitches`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch your pitches');
      }

      const data = await response.json();
      setUserPitches(data.pitches || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching pitches:', err);
    } finally {
      setFetchingPitches(false);
    }
  };

  const handleGeneratePitch = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE}/pitch/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slangText }),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate pitch');
      }

      const data = await response.json();
      setGeneratedPitch(data);
    } catch (err) {
      setError(err.message);
      console.error('Error generating pitch:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPitch = async () => {
    if (!generatedPitch) return;
    
    try {
      setLoading(true);
      setError(null);

      // First check if user is logged in
      const sessionCheck = await fetch(`${API_BASE}/auth/me`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      const sessionData = await sessionCheck.json();
      if (!sessionData?.user) {
        throw new Error('Please log in to submit a pitch');
      }

      const response = await fetch(`${API_BASE}/pitch/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          professionalPitch: generatedPitch.professional_pitch,
          originalText: slangText,
          extractedInfo: generatedPitch.extracted_info
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server response:', errorData);
        throw new Error(errorData.error || 'Failed to submit pitch');
      }

      const data = await response.json();
      console.log('Submission successful:', data);
      
      if (onSubmit) onSubmit(data.pitch);
      
      // Clear form after successful submission
      setSlangText('');
      setGeneratedPitch(null);
      
      // Show success message
      setError(null);
    } catch (err) {
      console.error('Submission error:', err);
      setError(err.message || 'Failed to submit pitch. Please try logging in again.');
      
      // If it's an auth error, we might want to trigger a re-login
      if (err.message.toLowerCase().includes('log in')) {
        // You might want to add a callback here to trigger re-login
        window.location.reload(); // For now, just reload to force re-login
      }
    } finally {
      setLoading(false);
    }
  };

  // If in view mode, render list of user's pitches
  if (viewOnly) {
    if (fetchingPitches) {
      return <div className="text-center">Loading your pitches...</div>;
    }

    if (error) {
      return (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">⚠️</div>
            <div className="ml-3">
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      );
    }

    if (!userPitches.length) {
      return (
        <div className="text-gray-500">
          You haven't created any pitches yet.
        </div>
      );
    }

    return (
      <div className="grid gap-6 md:grid-cols-2">
        {userPitches.map((pitch) => (
          <div key={pitch._id} className="bg-white p-4 rounded-lg shadow">
            <div className="mb-4">
              <span className="inline-block px-2 py-1 text-sm rounded bg-blue-100 text-blue-800">
                {pitch.status}
              </span>
            </div>
            <p className="text-gray-600 mb-4">{pitch.professionalPitch}</p>
            <div className="text-sm text-gray-500">
              <p>Loan Amount: {pitch.extractedInfo.loanAmount}</p>
              <p>Purpose: {pitch.extractedInfo.purpose}</p>
              <p>Business Type: {pitch.extractedInfo.businessType}</p>
            </div>
            <div className="mt-4 text-sm text-gray-400">
              Submitted: {new Date(pitch.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Creation mode
  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Describe your loan request in your own words
        </label>
        <textarea
          value={slangText}
          onChange={(e) => setSlangText(e.target.value)}
          className="w-full p-2 border rounded-md"
          rows={4}
          placeholder="Example: Yo, I need 50k to start my food truck business..."
        />
      </div>

      <button
        onClick={handleGeneratePitch}
        disabled={loading || !slangText.trim()}
        className="w-full bg-blue-600 text-white p-2 rounded-md mb-4 disabled:bg-gray-400"
      >
        {loading ? 'Generating...' : 'Generate Professional Pitch'}
      </button>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              ⚠️
            </div>
            <div className="ml-3">
              <p className="text-red-700">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {generatedPitch && (
        <div className="mt-4">
          <h3 className="font-medium mb-2">Generated Professional Pitch:</h3>
          <div className="bg-gray-50 p-4 rounded-md mb-4">
            {generatedPitch.professional_pitch}
          </div>
          
          <div className="mb-4">
            <h4 className="font-medium mb-2">Extracted Information:</h4>
            <ul className="list-disc pl-5">
              <li>Loan Amount: {generatedPitch.extracted_info.loan_amount}</li>
              <li>Purpose: {generatedPitch.extracted_info.purpose}</li>
              <li>Business Type: {generatedPitch.extracted_info.business_type}</li>
            </ul>
          </div>

          <button
            onClick={handleSubmitPitch}
            disabled={loading}
            className="w-full bg-green-600 text-white p-2 rounded-md disabled:bg-gray-400"
          >
            {loading ? 'Submitting...' : 'Submit Pitch'}
          </button>
        </div>
      )}
    </div>
  );
}

export default BorrowerCards;