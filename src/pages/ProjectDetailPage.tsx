import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Files, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TimelineView, TimelineEvent } from "@/components/project/TimelineView";

// Mock Data
const MOCK_EVENTS: TimelineEvent[] = [
  {
    id: "m1",
    type: "milestone",
    date: "2024-01-15",
    title: "Contract Signed",
    status: "signed",
    children: [
      {
        id: "e1",
        type: "email",
        date: "2024-01-15 14:30",
        sender: "Zhang San <zhang@example.com>",
        content:
          "The contract has been signed by both parties. Please find the scanned copy attached.",
        attachments: [
          { name: "contract_signed.pdf", type: "pdf", size: "2.3 MB" },
        ],
      },
      {
        id: "t1",
        type: "thread",
        date: "2024-01-14",
        children: [
          {
            id: "e1-1",
            type: "email",
            date: "2024-01-14 09:00",
            sender: "Finance Dept",
            content: "Payment terms approved.",
          },
          {
            id: "e1-2",
            type: "email",
            date: "2024-01-13 16:20",
            sender: "Me",
            content: "Can we confirm the payment schedule?",
          },
        ],
      },
    ],
  },
  {
    id: "e2",
    type: "email",
    date: "2024-01-10 10:00",
    sender: "Me",
    content:
      "Please check the modified contract version v3 based on legal feedback.",
    attachments: [
      { name: "contract_v3_final.pdf", type: "pdf", size: "2.1 MB" },
    ],
  },
  {
    id: "e3",
    type: "email",
    date: "2024-01-08 15:45",
    sender: "Li Si <li@example.com>",
    content: "Legal review comments attached. Please revise accordingly.",
    attachments: [
      { name: "legal_review_comments.docx", type: "doc", size: "156 KB" },
    ],
  },
  {
    id: "m2",
    type: "milestone",
    date: "2024-01-02",
    title: "Draft Submitted",
    children: [
      {
        id: "e4",
        type: "email",
        date: "2024-01-02 09:30",
        sender: "Zhang San <zhang@example.com>",
        content: "Initial draft for review.",
        attachments: [
          { name: "contract_draft_v1.pdf", type: "pdf", size: "1.8 MB" },
        ],
      },
    ],
  },
];

export function ProjectDetailPage() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  // In a real app, fetch project details by projectId
  const projectTitle = "Client A - 2024 Cooperation Agreement";

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">{projectTitle}</h1>
          <p className="text-xs text-muted-foreground">
            Last updated 2 hours ago
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm">
            <Search className="h-4 w-4 mr-2" />
            Search Project
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <Tabs defaultValue="timeline" className="flex-1 flex flex-col min-h-0">
          <div className="px-4 pt-2 border-b">
            <TabsList>
              <TabsTrigger value="timeline" className="flex gap-2">
                <Calendar className="h-4 w-4" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="artifacts" className="flex gap-2">
                <Files className="h-4 w-4" />
                Artifacts Library
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="timeline"
            className="flex-1 overflow-auto p-6 min-h-0"
          >
            <div className="max-w-3xl mx-auto">
              <TimelineView events={MOCK_EVENTS} />
            </div>
          </TabsContent>

          <TabsContent value="artifacts" className="flex-1 p-6 min-h-0">
            <div className="text-center text-muted-foreground mt-10">
              Artifacts Library view placeholder
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
