/* Shared work-specific intensity presentation. No network, storage, or work records. */
(function (root) {
  'use strict';
  const statuses = Object.freeze({
    legacy: '기존 입력값 · 재검토 전',
    user_confirmed: '사용자 확인값',
    provisional: '사진 확인 범위 기준 · 잠정',
    reviewed: '명시된 확인 범위 검토 완료',
    pending: '미평가'
  });
  const text = value => typeof value === 'string' && value.trim() ? value.trim() : null;
  const count = value => Number.isInteger(value) && value >= 0 ? value : null;
  function describe(work) {
    const candidate = work && typeof work === 'object' ? work.intensity : null;
    const record = candidate && typeof candidate === 'object' && !Array.isArray(candidate) && candidate.version === 1 ? candidate : {};
    const known = Object.prototype.hasOwnProperty.call(statuses, record.status);
    const status = known ? record.status : 'pending';
    const level = status !== 'pending' && Number.isInteger(record.level) && record.level >= 1 && record.level <= 5 ? record.level : null;
    const scope = record.scope && typeof record.scope === 'object' ? record.scope : {};
    const value = level === null ? '미평가' : level + '/5';
    const statusLabel = level === null ? '미평가' : statuses[status];
    return {
      version: 1, level, status, value, statusLabel,
      ariaLabel: level === null ? '수위 미평가' : '운영자 수위 기준 5단계 중 ' + level + '단계 · ' + statusLabel,
      exposure: text(record.exposure), presentation: text(record.presentation),
      scopeSummary: text(scope.summary) || '',
      scope: {summary: text(scope.summary) || '', photosReviewed: count(scope.photosReviewed), videosReviewed: count(scope.videosReviewed), totalPhotos: count(scope.totalPhotos)},
      basis: text(record.basis) || '', reviewedAt: text(record.reviewedAt), recordedAt: text(record.recordedAt), criteriaVersion: text(record.criteriaVersion)
    };
  }
  root.BCUTIntensity = Object.freeze({describe});
})(window);
