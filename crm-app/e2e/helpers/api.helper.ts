const API_URL = process.env.API_URL ?? 'http://localhost:3000';

interface CustomerPayload {
  companyName: string;
  status?: string;
  industry?: string;
}

interface ContactPayload {
  firstName: string;
  lastName: string;
  email?: string;
  customerId: string;
}

interface OpportunityPayload {
  name: string;
  customerId: string;
  stageId: string;
}

export class ApiHelper {
  private readonly jwt: string;
  private readonly baseUrl: string;

  private constructor(baseUrl: string, jwt: string) {
    this.baseUrl = baseUrl;
    this.jwt = jwt;
  }

  static async create(
    apiUrl: string = API_URL,
    email: string = process.env.E2E_ADMIN_EMAIL ?? 'admin@crm.local',
    password: string = process.env.E2E_ADMIN_PASSWORD ?? 'Admin@123',
  ): Promise<ApiHelper> {
    const res = await fetch(`${apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      throw new Error(`ApiHelper login failed: ${res.status} ${await res.text()}`);
    }
    const body = (await res.json()) as { data: { accessToken: string } };
    return new ApiHelper(apiUrl, body.data.accessToken);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api/v1${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.jwt}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok && res.status !== 204) {
      const text = await res.text();
      throw new Error(`API ${method} ${path} failed: ${res.status} ${text}`);
    }
    if (res.status === 204) return undefined as T;
    const json = (await res.json()) as { data: T };
    return json.data;
  }

  async createCustomer(name: string, extra?: Partial<CustomerPayload>): Promise<{ id: string }> {
    return this.request<{ id: string }>('POST', '/customers', {
      companyName: name,
      status: 'PROSPECT',
      ...extra,
    });
  }

  async archiveCustomer(id: string): Promise<void> {
    await this.request<void>('POST', `/customers/${id}/archive`);
  }

  async createContact(data: ContactPayload): Promise<{ id: string }> {
    return this.request<{ id: string }>('POST', '/contacts', data);
  }

  async deleteContact(id: string): Promise<void> {
    await this.request<void>('DELETE', `/contacts/${id}`);
  }

  async createOpportunity(data: OpportunityPayload): Promise<{ id: string }> {
    return this.request<{ id: string }>('POST', '/opportunities', data);
  }

  async closeOpportunityWon(id: string): Promise<void> {
    await this.request<void>('POST', `/opportunities/${id}/close/won`, { closeNote: 'E2E cleanup' });
  }

  async getFirstPipelineStageId(): Promise<string> {
    const stages = await this.request<Array<{ id: string; order: number }>>('GET', '/pipeline/stages');
    if (!stages || stages.length === 0) {
      throw new Error('No pipeline stages found — seed the database before running tests');
    }
    return stages.sort((a, b) => a.order - b.order)[0].id;
  }
}
