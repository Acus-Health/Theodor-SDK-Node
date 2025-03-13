/**
 * Theodor.ai SDK Constants
 * Defines constants and enumerations for the Theodor.ai API
 */

/**
 * Recording sites
 * @enum {string}
 */
const RecordingSite = {
	HEART: 'heart',
	LUNG: 'lung',
	ABDOMEN: 'abdomen'
  };
  
  /**
   * Murmur classifications
   * @enum {string}
   */
  const MurmurClassification = {
	ABSENT: 'normal',
	PRESENT: 'murmur',
	NO_SIGNAL: 'noise'
  };
  
  /**
   * Rhythm classifications
   * @enum {string}
   */
  const RhythmClassification = {
	REGULAR: 'rhythmic',
	IRREGULAR: 'arrhythmic',
	INCONCLUSIVE: 'inconclusive',
	NO_SIGNAL: 'noise'
  };
  
  /**
   * Confidence levels
   * @enum {string}
   */
  const ConfidenceLevel = {
	HIGH: 'high_conf',
	MEDIUM: 'medium_conf',
	LOW: 'low_conf',
  };
  
  
  /**
   * Segmentation event types
   * @enum {string}
   */
  const SegmentationType = {
	S1: 'S1',
	S2: 'S2',
	INSPIRATION: 'I',
	EXPIRATION: 'E',
	MURMUR: 'M',
	WHEEZE: 'W',
	CRACKLE: 'C',
	BOWEL_SOUND: 'BS'
  };
  
  /**
   * WebSocket event types
   * @enum {string}
   */
  const WebSocketEvent = {
	AUTHENTICATION_CHALLENGE: 'authentication_challenge',
	HELLO: 'hello',
	STATUS_CHANGE: 'status_change',
	ERROR: 'error'
  };
  
  /**
   * Report status values
   * @enum {string}
   */
  const ReportStatus = {
	COMPLETE: 'complete',
	PENDING: 'pending',
	FAILED: 'failed',
	IN_PROGRESS: 'in_progress'
  };
  
  /**
   * Vital parameter keys
   * @enum {string}
   */
  const VitalParameterKey = {
	HEART_RATE: 'heart_rate',
	RESPIRATORY_RATE: 'respiratory_rate',
  };
  
  module.exports = {
	RecordingSite,
	MurmurClassification,
	RhythmClassification,
	ConfidenceLevel,
	SegmentationType,
	WebSocketEvent,
	ReportStatus,
	VitalParameterKey
  };