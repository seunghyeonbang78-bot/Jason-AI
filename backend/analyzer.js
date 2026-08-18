const SIGNATURES = ["ㅋㅋ", "ㅎㅎ", "ㅇㅇ", "ㄹㅇ", "ㄱㄱ", "ㅈㄴ", "아니", "근데"];

export function emptyProfile() {
  return {
    version: 1,
    messagesAnalyzed: 0,
    totalCharacters: 0,
    questionMessages: 0,
    exclamationMessages: 0,
    emojiMessages: 0,
    signatureCounts: {},
    recentExamples: [],
    styleSummary: "아직 충분한 대화가 없습니다. 자연스럽게 대화하며 말투를 파악하세요.",
    updatedAt: null
  };
}

export function updateProfile(existing, message) {
  const profile = { ...emptyProfile(), ...existing };

  profile.messagesAnalyzed += 1;
  profile.totalCharacters += message.length;

  if (/\?/.test(message)) profile.questionMessages += 1;
  if (/!/.test(message)) profile.exclamationMessages += 1;
  if (/\p{Extended_Pictographic}/u.test(message)) profile.emojiMessages += 1;

  for (const token of SIGNATURES) {
    const matches = message.match(new RegExp(token, "g"));

    if (matches) {
      profile.signatureCounts[token] =
        (profile.signatureCounts[token] || 0) + matches.length;
    }
  }

  profile.recentExamples = [
    ...(profile.recentExamples || []),
    message.slice(0, 240)
  ].slice(-8);

  profile.styleSummary = makeStyleSummary(profile);
  profile.updatedAt = new Date().toISOString();

  return profile;
}

function makeStyleSummary(profile) {
  const count = profile.messagesAnalyzed;

  if (count < 3) {
    return "대화 표본이 적습니다. 사용자의 말투를 단정하지 말고 자연스럽게 맞춰 가세요.";
  }

  const averageLength = Math.round(profile.totalCharacters / count);

  const parts = [`평균 메시지 길이는 약 ${averageLength}자`];

  if (averageLength < 35) {
    parts.push("짧고 간결한 편");
  } else if (averageLength > 110) {
    parts.push("설명하는 문장이 긴 편");
  } else {
    parts.push("중간 길이의 문장을 쓰는 편");
  }

  if (profile.questionMessages / count >= 0.35) {
    parts.push("질문을 자주 던짐");
  }

  const commonExpressions = Object.entries(profile.signatureCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([token]) => token);

  if (commonExpressions.length) {
    parts.push(`자주 보인 표현: ${commonExpressions.join(", ")}`);
  }

  return `${parts.join(". ")}. 이 특성은 추정치이므로 과장해서 흉내 내지 마세요.`;
}
