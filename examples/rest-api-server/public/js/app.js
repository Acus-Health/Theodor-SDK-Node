document.addEventListener('DOMContentLoaded', () => {
	const uploadForm = document.getElementById('uploadForm');
	const uploadStatus = document.getElementById('uploadStatus');
	const resultsList = document.getElementById('resultsList');
	const submitBtn = document.getElementById('submitBtn');
	
	// API base URL
	const API_BASE_URL = '/api';
	
	// Load existing analyses on page load
	loadAnalyses();
	
	// Handle form submission
	uploadForm.addEventListener('submit', async (e) => {
	  e.preventDefault();
	  
	  const audioFile = document.getElementById('audioFile').files[0];
	  const site = document.getElementById('site').value;
	  const examId = document.getElementById('examId').value;
	  
	  if (!audioFile) {
		showStatus('Please select an audio file', 'error');
		return;
	  }
	  
	  // Create form data
	  const formData = new FormData();
	  formData.append('audio', audioFile);
	  formData.append('site', site);
	  
	  if (examId.trim()) {
		formData.append('examId', examId);
	  }
	  
	  try {
		// Disable submit button and show loading status
		submitBtn.disabled = true;
		showStatus('Uploading and analyzing audio...', 'info');
		
		// Submit the audio file
		const response = await fetch(`${API_BASE_URL}/analysis/submit`, {
		  method: 'POST',
		  body: formData
		});
		
		const result = await response.json();
		
		if (!response.ok) {
		  throw new Error(result.message || 'Failed to upload audio');
		}
		
		// Show success message
		showStatus(`${result.message} - Analysis ID: ${result.data.analysisId}`, 'success');
		
		// Reset form
		uploadForm.reset();
		
		// Add the new analysis to the list
		const analysisId = result.data.analysisId;
		
		// After a short delay, poll for the analysis status
		setTimeout(() => {
		  pollAnalysisStatus(analysisId);
		}, 2000);
		
	  } catch (error) {
		showStatus(`Error: ${error.message}`, 'error');
	  } finally {
		// Re-enable submit button
		submitBtn.disabled = false;
	  }
	});
	
	/**
	 * Load all analyses
	 */
	async function loadAnalyses() {
	  try {
		showStatus('Loading analyses...', 'info');
		
		const response = await fetch(`${API_BASE_URL}/analysis`);
		
		if (!response.ok) {
		  throw new Error('Failed to load analyses');
		}
		
		const result = await response.json();
		
		if (result.data.length === 0) {
		  showStatus('No analyses found. Upload an audio file to get started.', 'info');
		  return;
		}
		
		// Hide status after successful load
		uploadStatus.classList.add('hidden');
		
		// Clear results list
		resultsList.innerHTML = '';
		
		// Add each analysis to the list
		result.data.forEach(analysis => {
		  addAnalysisToList(analysis);
		  
		  // If analysis is still processing, poll for updates
		  if (analysis.status === 'processing') {
			pollAnalysisStatus(analysis.analysisId);
		  }
		});
		
	  } catch (error) {
		showStatus(`Error: ${error.message}`, 'error');
	  }
	}
	
	/**
	 * Poll for analysis status updates
	 * @param {string} analysisId - Analysis ID
	 */
	async function pollAnalysisStatus(analysisId) {
	  try {
		const response = await fetch(`${API_BASE_URL}/analysis/${analysisId}`);
		
		if (!response.ok) {
		  throw new Error('Failed to get analysis status');
		}
		
		const result = await response.json();
		const analysis = result.data;
		
		// Update UI with the current status
		updateAnalysisInList(analysis);
		
		// If still processing, poll again after a delay
		if (analysis.status === 'processing') {
		  setTimeout(() => {
			pollAnalysisStatus(analysisId);
		  }, 5000); // Poll every 5 seconds
		}
		
	  } catch (error) {
		console.error(`Error polling analysis ${analysisId}:`, error);
		// Don't show UI error for polling failures
	  }
	}
	
	/**
	 * Add an analysis to the results list
	 * @param {Object} analysis - Analysis object
	 */
	function addAnalysisToList(analysis) {
	  const card = document.createElement('div');
	  card.className = 'result-card';
	  card.id = `analysis-${analysis.analysisId}`;
	  
	  const createdDate = new Date(analysis.createdAt).toLocaleString();
	  
	  // Create card content without inline event handlers
	  const header = document.createElement('div');
	  header.className = 'result-header';
	  header.innerHTML = `
		<div class="result-title">Analysis ${analysis.analysisId.substring(0, 8)}...</div>
		<div class="result-status status-${analysis.status}">${analysis.status}</div>
	  `;
	  
	  const content = document.createElement('div');
	  content.className = 'result-content';
	  content.innerHTML = `
		<p><strong>Site:</strong> ${analysis.site}</p>
		<p><strong>Created:</strong> ${createdDate}</p>
		${analysis.completedAt ? `<p><strong>Completed:</strong> ${new Date(analysis.completedAt).toLocaleString()}</p>` : ''}
	  `;
	  
	  const actions = document.createElement('div');
	  actions.className = 'result-actions';
	  
	  // Create refresh button with proper event listener
	  const refreshButton = document.createElement('button');
	  refreshButton.className = 'btn-refresh';
	  refreshButton.textContent = 'Refresh';
	  refreshButton.dataset.analysisId = analysis.analysisId;
	  refreshButton.addEventListener('click', function() {
		pollAnalysisStatus(this.dataset.analysisId);
	  });
	  
	  actions.appendChild(refreshButton);
	  
	  // Add view button if analysis is completed
	  if (analysis.status === 'completed') {
		const viewButton = document.createElement('button');
		viewButton.className = 'btn-view';
		viewButton.textContent = 'View Predictions';
		viewButton.dataset.analysisId = analysis.analysisId;
		viewButton.addEventListener('click', function() {
		  viewPredictions(this.dataset.analysisId);
		});
		
		actions.appendChild(viewButton);
	  }
	  
	  // Append all elements to the card
	  card.appendChild(header);
	  card.appendChild(content);
	  card.appendChild(actions);
	  
	  // Add the card to the results list
	  resultsList.prepend(card);
	}
	
	/**
	 * Update an analysis in the results list
	 * @param {Object} analysis - Analysis object
	 */
	function updateAnalysisInList(analysis) {
	  const card = document.getElementById(`analysis-${analysis.analysisId}`);
	  
	  if (!card) {
		// If the card doesn't exist yet, add it
		addAnalysisToList(analysis);
		return;
	  }
	  
	  // Clear the card
	  card.innerHTML = '';
	  
	  const createdDate = new Date(analysis.createdAt).toLocaleString();
	  
	  // Recreate card content
	  const header = document.createElement('div');
	  header.className = 'result-header';
	  header.innerHTML = `
		<div class="result-title">Analysis ${analysis.analysisId.substring(0, 8)}...</div>
		<div class="result-status status-${analysis.status}">${analysis.status}</div>
	  `;
	  
	  const content = document.createElement('div');
	  content.className = 'result-content';
	  content.innerHTML = `
		<p><strong>Site:</strong> ${analysis.site}</p>
		<p><strong>Created:</strong> ${createdDate}</p>
		${analysis.completedAt ? `<p><strong>Completed:</strong> ${new Date(analysis.completedAt).toLocaleString()}</p>` : ''}
	  `;
	  
	  const actions = document.createElement('div');
	  actions.className = 'result-actions';
	  
	  // Create refresh button
	  const refreshButton = document.createElement('button');
	  refreshButton.className = 'btn-refresh';
	  refreshButton.textContent = 'Refresh';
	  refreshButton.dataset.analysisId = analysis.analysisId;
	  refreshButton.addEventListener('click', function() {
		pollAnalysisStatus(this.dataset.analysisId);
	  });
	  
	  actions.appendChild(refreshButton);
	  
	  // Add view button if analysis is completed
	  if (analysis.status === 'completed') {
		const viewButton = document.createElement('button');
		viewButton.className = 'btn-view';
		viewButton.textContent = 'View Predictions';
		viewButton.dataset.analysisId = analysis.analysisId;
		viewButton.addEventListener('click', function() {
		  viewPredictions(this.dataset.analysisId);
		});
		
		actions.appendChild(viewButton);
	  }
	  
	  // Append all elements to the card
	  card.appendChild(header);
	  card.appendChild(content);
	  card.appendChild(actions);
	}
	
	/**
	 * Show status message
	 * @param {string} message - Status message
	 * @param {string} type - Status type (success, error, warning, info)
	 */
	function showStatus(message, type = 'info') {
	  uploadStatus.textContent = message;
	  uploadStatus.className = `status-box status-${type}`;
	  uploadStatus.classList.remove('hidden');
	}
	
	/**
	 * View predictions for an analysis
	 * @param {string} analysisId - Analysis ID
	 */
	async function viewPredictions(analysisId) {
	  try {
		const response = await fetch(`${API_BASE_URL}/analysis/${analysisId}/predictions`);
		
		if (!response.ok) {
		  throw new Error('Failed to get predictions');
		}
		
		const result = await response.json();
		const predictions = result.data;
		
		// Create modal to display predictions
		const modal = document.createElement('div');
		modal.className = 'modal';
		
		const modalContent = document.createElement('div');
		modalContent.className = 'modal-content';
		
		// Create title
		const title = document.createElement('h3');
		title.textContent = `Predictions for Analysis ${analysisId.substring(0, 8)}...`;
		modalContent.appendChild(title);
		
		// Create definition list for predictions
		const dl = document.createElement('dl');
		
		// Add prediction data
		addDefinitionItem(dl, 'Murmur', predictions.murmur);
		addDefinitionItem(dl, 'Murmur Certainty', predictions.murmur_certainty);
		addDefinitionItem(dl, 'Rhythm', predictions.rhythm);
		addDefinitionItem(dl, 'Heart Rate', `${predictions.heart_rate} BPM`);
		
		modalContent.appendChild(dl);
		
		// Add findings if available
		if (predictions.findings && predictions.findings.length > 0) {
		  const findingsTitle = document.createElement('h4');
		  findingsTitle.textContent = 'Findings';
		  modalContent.appendChild(findingsTitle);
		  
		  const findingsList = document.createElement('ul');
		  predictions.findings.forEach(finding => {
			const listItem = document.createElement('li');
			listItem.textContent = finding;
			findingsList.appendChild(listItem);
		  });
		  
		  modalContent.appendChild(findingsList);
		}
		
		// Add close button
		const closeButton = document.createElement('button');
		closeButton.className = 'btn-close';
		closeButton.textContent = 'Close';
		closeButton.addEventListener('click', () => {
		  document.body.removeChild(modal);
		});
		
		modalContent.appendChild(closeButton);
		modal.appendChild(modalContent);
		
		// Add modal to document
		document.body.appendChild(modal);
		
		// Close modal when clicking outside content
		modal.addEventListener('click', (e) => {
		  if (e.target === modal) {
			document.body.removeChild(modal);
		  }
		});
		
		// Add CSS for modal
		addModalStyles();
		
	  } catch (error) {
		showStatus(`Error: ${error.message}`, 'error');
	  }
	}
	
	/**
	 * Helper function to add definition term and description to a definition list
	 */
	function addDefinitionItem(dl, term, description) {
	  const dt = document.createElement('dt');
	  dt.textContent = term;
	  
	  const dd = document.createElement('dd');
	  dd.textContent = description || 'N/A';
	  
	  dl.appendChild(dt);
	  dl.appendChild(dd);
	}
	
	/**
	 * Add modal styles to the document
	 */
	function addModalStyles() {
	  // Check if styles already exist
	  if (document.getElementById('modal-styles')) {
		return;
	  }
	  
	  const style = document.createElement('style');
	  style.id = 'modal-styles';
	  style.textContent = `
		.modal {
		  position: fixed;
		  top: 0;
		  left: 0;
		  width: 100%;
		  height: 100%;
		  background-color: rgba(0, 0, 0, 0.5);
		  display: flex;
		  justify-content: center;
		  align-items: center;
		  z-index: 1000;
		}
		
		.modal-content {
		  background-color: white;
		  padding: 30px;
		  border-radius: 8px;
		  max-width: 500px;
		  width: 100%;
		  max-height: 80vh;
		  overflow-y: auto;
		}
		
		.modal h3 {
		  margin-top: 0;
		  color: var(--secondary-color);
		}
		
		.modal dl {
		  display: grid;
		  grid-template-columns: 150px 1fr;
		  gap: 10px;
		  margin-bottom: 20px;
		}
		
		.modal dt {
		  font-weight: 600;
		  color: var(--secondary-color);
		}
		
		.modal ul {
		  margin-left: 20px;
		}
		
		.btn-close {
		  margin-top: 20px;
		}
	  `;
	  
	  document.head.appendChild(style);
	}
  });