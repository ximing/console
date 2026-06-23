import request from '../utils/request';

export interface PillarDetail {
  shishen_gan?: string;
  shishen_gan_sub?: string;
  canggan?: { gan: string; shishen: string }[];
  nayin?: string;
  shenshas?: string[];
  xiyun?: string;
  zizuo?: string;
  kongwang?: string;
}

export interface DayunDto {
  id: string;
  profileId: string;
  gan: string;
  zhi: string;
  startYear: number;
  sortOrder: number;
}

export interface InsightProfileDto {
  id: string;
  userId: string;
  name: string;
  yearGan: string;
  yearZhi: string;
  monthGan: string;
  monthZhi: string;
  dayGan: string;
  dayZhi: string;
  hourGan: string;
  hourZhi: string;
  yearDetail: PillarDetail | null;
  monthDetail: PillarDetail | null;
  dayDetail: PillarDetail | null;
  hourDetail: PillarDetail | null;
  shenshas: string[] | null;
  birthYear: number;
  birthDate?: string | null;
  birthTime?: string | null;
  customAspects: string[] | null;
  sortOrder: number;
  dayunList: DayunDto[];
  createdAt: string;
  updatedAt: string;
}

export interface ParsedBaziResult {
  yearGan: string;
  yearZhi: string;
  monthGan: string;
  monthZhi: string;
  dayGan: string;
  dayZhi: string;
  hourGan: string;
  hourZhi: string;
  birthYear: number | null;
  birthDate: string | null;
  birthTime: string | null;
  yearDetail: PillarDetail | null;
  monthDetail: PillarDetail | null;
  dayDetail: PillarDetail | null;
  hourDetail: PillarDetail | null;
  shenshas: string[];
}

export type CreateProfileInput = Omit<InsightProfileDto, 'id' | 'userId' | 'dayunList' | 'createdAt' | 'updatedAt'> & {
  birthDate?: string | null;
};

export interface DayunInput {
  gan: string;
  zhi: string;
  startYear: number;
  sortOrder: number;
}

interface ApiResponse<T> {
  code: number;
  data: T;
  msg?: string;
}

export const insightApi = {
  getProfiles: async (): Promise<InsightProfileDto[]> => {
    const res = await request.get<unknown, ApiResponse<{ profiles: InsightProfileDto[] }>>(
      '/api/v1/insight/profiles'
    );
    return res.data.profiles;
  },

  createProfile: async (data: CreateProfileInput): Promise<InsightProfileDto> => {
    const res = await request.post<CreateProfileInput, ApiResponse<InsightProfileDto>>(
      '/api/v1/insight/profiles',
      data
    );
    return res.data;
  },

  updateProfile: async (id: string, data: Partial<CreateProfileInput>): Promise<InsightProfileDto> => {
    const res = await request.put<Partial<CreateProfileInput>, ApiResponse<InsightProfileDto>>(
      `/api/v1/insight/profiles/${id}`,
      data
    );
    return res.data;
  },

  deleteProfile: async (id: string): Promise<void> => {
    await request.delete(`/api/v1/insight/profiles/${id}`);
  },

  replaceDayun: async (profileId: string, dayunList: DayunInput[]): Promise<DayunDto[]> => {
    const res = await request.post<{ dayunList: DayunInput[] }, ApiResponse<{ dayunList: DayunDto[] }>>(
      `/api/v1/insight/profiles/${profileId}/dayun`,
      { dayunList }
    );
    return res.data.dayunList;
  },

  parseBazi: async (text: string): Promise<ParsedBaziResult> => {
    const res = await request.post<{ text: string }, ApiResponse<ParsedBaziResult>>(
      '/api/v1/insight/parse-bazi',
      { text }
    );
    if (res.code !== 0) throw new Error(res.msg ?? 'AI解析失败');
    return res.data;
  },
};
