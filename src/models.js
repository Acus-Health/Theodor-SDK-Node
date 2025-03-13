/**
 * Theodor.ai SDK Data Models
 * Type definitions for Theodor.ai API requests and responses
 */

/**
 * @typedef {Object} WebSocketEvents
 * @property {string} RECORDING_CLASSIFIED - 'audio_recording_classified'
 * @property {string} RECORDING_DELETED - 'audio_recording_deleted'
 * @property {string} RECORDING_UPDATED - 'audio_recording_updated'
 * @property {string} RECORDING_UPLOADED - 'audio_recording_uploaded'
 * @property {string} RECORDING_CREATED - 'audio_recording_created'
 * @property {string} RECORDING_CLASSIFICATION_FAILURE - 'audio_recording_classification_failure'
 * @property {string} SPECTROGRAM_GENERATED - 'audio_recording_spec_created'
 * @property {string} RECORDING_ENHANCED - 'audio_recording_enhanced'
 * @property {string} RECORDING_ENHANCEMENT_FAILED - 'audio_recording_enhancement_failed'
 * @property {string} RECORDING_ENHANCEMENT_STARTED - 'audio_recording_enhancement_started'
 * @property {string} RECORDING_ENHANCEMENT_COMPLETE - 'audio_recording_denoised'
 * @property {string} PROCESSING_QUEUE_STATE_CHANGED - 'processing_queue_state_changed'
 */

/**
 * @typedef {Object} WebSocketMessage
 * @property {string} event - Event type
 * @property {Object} data - Event data
 * @property {number} seq - Sequence number
 * @property {string} broadcast - Broadcast information
 */

/**
 * @typedef {Object} RecordingClassifiedEvent
 * @property {string} audio_id - Recording ID
 * @property {string} exam_id - Exam ID
 * @property {string} murmur - Murmur classification
 * @property {string} murmur_average_predictions - Average murmur predictions
 * @property {number} murmur_certainty - Murmur certainty
 * @property {string} segmentation - Segmentation data
 * @property {number} timestamp - Timestamp
 * @property {number} heart_rate - Heart rate
 * @property {Object} report - Report
 * @property {number} progress - Progress
 * @property {number} created_at - Creation timestamp
 * @property {string} message - Message
 * @property {string} downloadLink - Download link
 * @property {string} link - Link
 */

/**
 * @typedef {Object} AuthRequest
 * @property {string} login_id - Username or email
 * @property {string} password - Password
 */

/**
 * @typedef {Object} AuthResponse
 * @property {string} token - Authentication token
 * @property {User} user - User object
 * @property {string} accessToken - Access token
 * @property {string} refreshToken - Refresh token
 */

/**
 * @typedef {Object} User
 * @property {string} id - User ID
 * @property {string} username - Username
 * @property {string} email - Email
 * @property {string} first_name - First name
 * @property {string} last_name - Last name
 * @property {number} create_at - Creation timestamp
 * @property {number} update_at - Update timestamp
 * @property {number} delete_at - Deletion timestamp
 * @property {string} auth_data - Authentication data
 * @property {string} auth_service - Authentication service
 * @property {string} nickname - Nickname
 * @property {string} position - Position
 * @property {string} roles - Roles
 * @property {number} last_password_update - Last password update timestamp
 * @property {string} locale - User locale
 * @property {string} team_id - Team ID
 */

/**
 * @typedef {Object} ErrorResponse
 * @property {string} id - Error ID
 * @property {string} message - Error message
 * @property {string} detailed_error - Detailed error message
 * @property {string} request_id - Request ID
 * @property {number} status_code - HTTP status code
 */

/**
 * @typedef {Object} Exam
 * @property {string} Id - Exam ID
 * @property {string} UserId - User ID
 * @property {number} VisitDate - Visit date timestamp
 * @property {string} PatientId - Patient ID
 * @property {number} Age - Patient age
 * @property {string} Sex - Patient sex
 * @property {string} Diagnosis - Diagnosis
 * @property {string} Complaint - Complaint
 * @property {string} History - Medical history
 * @property {string} EchoDiagnoses - Echo diagnoses
 * @property {number} CreatedAt - Creation timestamp
 * @property {number} UpdatedAt - Update timestamp
 * @property {Array<ExamAudioEntry>} ExamAudioEntries - Audio entries
 */

/**
 * @typedef {Object} ExamAudioEntry
 * @property {string} id - Entry ID
 * @property {string} filename - Filename
 * @property {string} file - File path
 * @property {Array<string>} filenames - List of filenames
 * 
 * @property {string} murmur - Murmur classification
 * @property {string} murmur_average_predictions - Average murmur predictions
 * @property {string} murmur_certainty - Murmur certainty
 * 
 * @property {number} hr - Heart rate
 * @property {number} heart_tone_time_variance - Heart tone time variance
 * @property {number} S1_durarion - S1 duration
 * @property {number} S2_durarion - S2 duration
 * @property {number} std_s1 - S1 standard deviation
 * @property {number} std_s2 - S2 standard deviation
 * @property {number} avg_systole - Average systole duration
 * @property {number} avg_diastole - Average diastole duration
 * @property {number} ibi - Inter-beat interval
 * @property {number} sdnn - Standard deviation of NN intervals
 * 
 * @property {string} segmentation - Segmentation data
 * @property {number} sound_quality - Sound quality score (0-5)
 * @property {number} processing_time - Processing time (ms)
 * @property {number} pred_time - Prediction time (ms)
 * 
 * @property {number} size - File size (bytes)
 * @property {number} timestamp - Timestamp (Unix timestamp)
 * @property {number} updated_at - Update timestamp (Unix timestamp)
 * @property {string} user_id - User ID
 * @property {string} location - Recording location (e.g. "left sternal border")
 * @property {string} device - Recording device (e.g. "HC 21")
 * 
 * @property {string} rhythm - Rhythm classification (e.g. "rhythmic")
 * 
 * @property {string} exam_id - Exam ID
 * @property {string} country - Country (e.g. "US")
 * 
 * @property {ExamAudioEntryMetadata} metadata - Metadata
 * @property {ExamAudioEntryReport} report - Report
 * @property {string} prediction_report - Prediction report
 */

/**
 * @typedef {Object} ExamAudioEntryMetadata
 * @property {Array<ExamAudioEntryFile>} files - Files
 */

/**
 * @typedef {Object} ExamAudioEntryFile
 * @property {string} id - File ID
 * @property {string} user_id - User ID
 * @property {string} post_id - Audio Entry ID
 * @property {number} create_at - Creation timestamp (Unix timestamp)
 * @property {number} update_at - Update timestamp (Unix timestamp)
 * @property {number} delete_at - Deletion timestamp (Unix timestamp)
 * @property {number} sample_rate - Sample rate (Hz)
 * @property {number} channels - Number of channels 
 * @property {number} byte_rate - Byte rate (bps)
 * @property {number} format - Format
 * @property {number} bps - Bits per sample
 * @property {number} seconds - Duration in seconds (float)
 * @property {number} mean - Mean amplitude
 * @property {number} std - Standard deviation of amplitude
 * @property {string} device - Recording device (e.g. "HC 21")
 * @property {string} name - Filename
 * @property {string} extension - File extension
 * @property {number} size - File size
 * @property {string} mime_type - MIME type
 */

/**
 * @typedef {Object} ExamAudioEntryReport
 * @property {string} language - Report language (e.g. "en")
 * @property {string} status - Report status (e.g. "complete")
 * @property {string} date - Report date (e.g. "2024-01-01")
 * @property {string} device - Device information (e.g. "HC 21")
 * @property {string} message - Report message (e.g. "Report generated successfully")
 * @property {Array<string>} events - Events 
 * @property {Array<ExamAudioEntryFinding>} summary - Summary findings
 * @property {Array<ExamAudioEntryDetailedFinding>} findings - Detailed findings
 * @property {Array<ExamAudioEntryVitalParameter>} vital_parameters - Vital parameters
 * @property {string} signal_type - Signal type (e.g. "audio")
 * @property {number} background_noise - Background noise level (0-5)
 * @property {number} sound_quality - Sound quality score (0-5)
 */

/**
 * @typedef {Object} ExamAudioEntryFinding
 * @property {string} key - Finding key
 * @property {string} name - Finding name
 * @property {string} professional_name - Professional name
 */

/**
 * @typedef {Object} ExamAudioEntryDetailedFinding
 * @property {string} key - Finding key
 * @property {string} name - Finding name
 * @property {string} professionalName - Professional name
 * @property {string} message - Finding message
 * @property {Array<string>} codes - Medical codes 
 * @property {string} confidence_code - Confidence code (e.g. "high_conf")
 * @property {string} confidence - Confidence level (e.g. High Confidence)
 * @property {number} conf - Confidence score (0-100)
 */

/**
 * @typedef {Object} ExamAudioEntryVitalParameter
 * @property {string} key - Parameter key (e.g. "finding:HeartRate")
 * @property {number} value - Parameter value (e.g. 72)
 * @property {string} code - Medical code (e.g. "C0018810" UMLS code)
 */

/**
 * @typedef {Object} ExamsResponse
 * @property {Array<string>} order - Order of exams
 * @property {Array<Exam>} exams - List of exams
 * @property {number} Total - Total number of exams
 * @property {RequestParams} Request - Request parameters
 * @property {string} next - Next page token
 */

/**
 * @typedef {Object} RequestParams
 * @property {number} Page - Page number
 * @property {number} PageSize - Page size
 * @property {string} OrderBy - Order by field
 * @property {number} OrderDirection - Order direction
 * @property {string} SearchQuery - Search query
 * @property {string} Mode - Mode
 */

/**
 * @typedef {Object} Recording
 * @property {string} id - Recording ID
 * @property {string} filename - Filename
 * @property {string} file - File path
 * @property {Array<string>} filenames - List of filenames
 * 
 * @property {string} murmur - Murmur classification
 * @property {string} murmur_average_predictions - Average murmur predictions - array of confidence scores, e.g. [71.952, 0.338, 27.71]
 * @property {string} murmur_certainty - Murmur certainty - float value, e.g. 71.952
 * 
 * @property {number} hr - Heart rate
 * @property {number} heart_tone_time_variance - Heart tone time variance
 * @property {number} s1_duration - S1 duration
 * @property {number} s2_duration - S2 duration
 * @property {number} std_s1 - S1 standard deviation
 * @property {number} std_s2 - S2 standard deviation
 * @property {number} avg_systole - Average systole duration
 * @property {number} avg_diastole - Average diastole duration
 * @property {number} ibi - Inter-beat interval
 * @property {number} sdnn - Standard deviation of NN intervals
 * 
 * @property {string} segmentation - Segmentation data
 * @property {number} sound_quality - Sound quality score (0-5)
 * @property {number} processing_time - Processing time (ms)
 * @property {number} pred_time - Prediction time (ms)
 * 
 * @property {number} size - File size
 * @property {number} timestamp - Timestamp
 * @property {string} location - Recording location
 * @property {string} device - Recording device
 * 
 * @property {string} rhythm - Rhythm classification
 * 
 * @property {string} exam_id - Exam ID
 * @property {string} country - Country
 * 
 * @property {RecordingMetadata} metadata - Metadata
 * @property {RecordingReport} report - Report
 * @property {string} prediction_report - Prediction report
 */

/**
 * @typedef {Object} RecordingMetadata
 * @property {Array<FileMetadata>} files - Files
 */

/**
 * @typedef {Object} FileMetadata
 * @property {string} id - File ID
 * @property {string} name - Filename
 * @property {string} extension - File extension
 * @property {number} size - File size
 * @property {string} mimeType - MIME type
 */

/**
 * @typedef {Object} AudioFileMetadata
 * @property {string} id - File ID
 * @property {string} userId - User ID
 * @property {string} postId - Post ID
 * @property {number} createAt - Creation timestamp
 * @property {number} updateAt - Update timestamp
 * @property {number} deleteAt - Deletion timestamp
 * @property {number} sampleRate - Sample rate
 * @property {number} channels - Number of channels
 * @property {number} byteRate - Byte rate
 * @property {number} format - Format
 * @property {number} bps - Bits per sample
 * @property {number} seconds - Duration in seconds
 * @property {number} mean - Mean amplitude
 * @property {number} std - Standard deviation of amplitude
 * @property {string} device - Recording device
 * @property {string} name - Filename
 * @property {string} extension - File extension
 * @property {number} size - File size
 * @property {string} mimeType - MIME type
 */

/**
 * @typedef {Object} ImageFileMetadata
 * @property {string} id - File ID
 * @property {string} userId - User ID
 * @property {string} postId - Post ID
 * @property {number} createAt - Creation timestamp
 * @property {number} updateAt - Update timestamp
 * @property {number} deleteAt - Deletion timestamp
 * @property {string} name - Filename
 * @property {string} extension - File extension
 * @property {number} size - File size
 * @property {string} mimeType - MIME type
 * @property {boolean} hasEnhanced - Whether enhanced version exists
 */

/**
 * @typedef {Object} RecordingReport
 * @property {string} language - Report language
 * @property {string} status - Report status
 * @property {string} date - Report date
 * @property {string} device - Device information
 * @property {string} message - Report message
 * @property {Array<string>} events - Events
 * @property {Array<SummaryFinding>} summary - Summary findings
 * @property {Array<DetailedFinding>} findings - Detailed findings
 * @property {Array<VitalParameter>} vitalParameters - Vital parameters
 */

/**
 * @typedef {Object} SummaryFinding
 * @property {string} key - Finding key
 * @property {string} name - Finding name
 * @property {string} professionalName - Professional name
 */

/**
 * @typedef {Object} DetailedFinding
 * @property {string} key - Finding key
 * @property {string} name - Finding name
 * @property {string} professionalName - Professional name
 * @property {string} message - Finding message
 * @property {Array<string>} codes - Medical codes
 * @property {string} confidenceCode - Confidence code
 * @property {string} confidence - Confidence level
 * @property {number} conf - Confidence score
 */

/**
 * @typedef {Object} VitalParameter
 * @property {string} key - Parameter key
 * @property {number} value - Parameter value
 * @property {string} code - Medical code
 */

/**
 * @typedef {Object} Segmentation
 * @property {Array<Array<number|string>>} S1 - S1 heart sound segments
 * @property {Array<Array<number|string>>} S2 - S2 heart sound segments
 * @property {Array<Array<number|string>>} I - Inspiration segments
 * @property {Array<Array<number|string>>} E - Expiration segments
 * @property {Array<Array<number|string>>} W - Wheezing segments
 * @property {Array<Array<number|string>>} M - Murmur segments
 * @property {Array<Array<number|string>>} BS - Bowel sound segments
 * @property {Array<Array<number|string>>} C - Crackle segments
 */

/**
 * @typedef {Object} SoundEvent
 * @property {string} type - Event type
 * @property {number} start - Start time
 * @property {number} end - End time
 * @property {string} label - Event label
 */

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
	module.exports = {};
} else if (typeof define === 'function' && define.amd) {
	define([], function() { return {}; });
}