import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Sparkles, Mail, Phone, MoreHorizontal } from "lucide-react";
import ixiFlowerProfilePic from "@/assets/ixi_flower.jpg";
import freaklessProfilePic from '@/assets/freakless.jpg';

interface ProfileCardProps {
  username: string;
  imageUrl?: string;
  role?: string;
  skills?: string[];
  status?: 'active' | 'away' | 'offline';
  email?: string;
  phone?: string;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  username,
  imageUrl,
  role = 'Core Contributor',
  skills = ['Planner', 'Calendar'],
  status = 'active',
  email,
  phone
}) => {
  const initials = React.useMemo(() => username.slice(0, 2).toUpperCase(), [username]);

  const statusColors = {
    active: 'bg-green-500',
    away: 'bg-yellow-500',
    offline: 'bg-gray-500'
  };

  return (
    <Card className="relative overflow-hidden border border-border bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-secondary" />
      <CardHeader className="py-4 px-5">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 opacity-80" /> Team Member
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative">
            <Avatar className="size-16 ring-2 ring-border">
              {imageUrl ? (
                <AvatarImage src={imageUrl} alt={username} />
              ) : (
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              )}
            </Avatar>
            <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-background ${statusColors[status]}`}></div>
          </div>

          <div className="flex-1 min-w-0 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="text-base font-semibold truncate">{username}</div>
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 capitalize">
                  {status}
                </Badge>
              </div>

              <div className="flex gap-1 mt-2 sm:mt-0">
                <Button size="sm" variant="outline" className="h-8 w-8 p-0" title="Message">
                  <Mail className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0" title="Call">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0" title="More">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground mb-3">{role}</div>

            <div className="flex flex-wrap gap-2 mb-4">
              {skills.map((skill, index) => (
                <Badge key={index} className="text-xs" variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              {email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  <span className="truncate max-w-[120px]">{email}</span>
                </div>
              )}
              {phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  <span>{phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const Teams: React.FC = () => {
  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Team Collaboration
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Your core collaborators at a glance.</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline">Filter</Button>
          <Button>Add Member</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        <ProfileCard
          username="ixi_flower"
          imageUrl={ixiFlowerProfilePic}
          role="Lead Developer"
          skills={['Backend', 'API', 'Database']}
          status="active"
          email="ixi@example.com"
          phone="+1 (555) 123-4567"
        />
        <ProfileCard
          username="freakless"
          imageUrl={freaklessProfilePic}
          role="UI/UX Designer"
          skills={['Frontend', 'Design', 'Prototyping']}
          status="away"
          email="freakless@example.com"
          phone="+1 (555) 987-6543"
        />
        <ProfileCard
          username="dev_user"
          role="QA Engineer"
          skills={['Testing', 'Automation', 'CI/CD']}
          status="offline"
          email="dev@example.com"
          phone="+1 (555) 456-7890"
        />
        <ProfileCard
          username="project_mgr"
          role="Project Manager"
          skills={['Planning', 'Coordination', 'Documentation']}
          status="active"
          email="pm@example.com"
          phone="+1 (555) 234-5678"
        />
      </div>
    </div>
  );
};

export default Teams;


