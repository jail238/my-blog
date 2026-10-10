import { onLiveRecords, startLiveRecords } from './live-records.js';
import { applyLiveRecordUi } from './live-record-render.js';

onLiveRecords(applyLiveRecordUi);
startLiveRecords();
