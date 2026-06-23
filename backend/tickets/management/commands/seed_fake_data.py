from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from datetime import datetime, date
import random
import json

from authentication.models import User
from tickets.models import AssignedTask, Report, Submission, ChecklistItem


class Command(BaseCommand):
    help = "Seed fake employees, tasks, reports, and submissions for a given date"

    def add_arguments(self, parser):
        parser.add_argument(
            "--date",
            type=str,
            default=None,
            help="Seed date in YYYY-MM-DD, defaults to today",
        )
        parser.add_argument(
            "--count", type=int, default=20, help="Number of users/submissions to seed"
        )
        parser.add_argument(
            "--user",
            type=str,
            default=None,
            help="Seed a specific username (e.g., seeduser40)",
        )
        parser.add_argument(
            "--tasks",
            type=int,
            default=None,
            help="Override tasks count for the targeted user",
        )
        parser.add_argument(
            "--long-note",
            action="store_true",
            help="Generate an extra-long note for layout testing",
        )
        parser.add_argument(
            "--article",
            action="store_true",
            help="Append random article paragraphs to notes",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force reseed by clearing existing for date",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        seed_date_str = options.get("date")
        count = int(options.get("count") or 20)
        target_user = options.get("user")
        tasks_override = options.get("tasks")
        long_note = bool(options.get("long_note"))
        article = bool(options.get("article"))
        force = bool(options.get("force"))

        if seed_date_str:
            try:
                seed_date = datetime.strptime(seed_date_str, "%Y-%m-%d").date()
            except ValueError:
                self.stderr.write(
                    self.style.ERROR("Invalid --date format, expected YYYY-MM-DD")
                )
                return
        else:
            seed_date = timezone.localdate()

        self.stdout.write(
            self.style.WARNING(f"Seeding {count} users/submissions for {seed_date}")
        )

        if force:
            # Clear existing for this date
            Submission.objects.filter(date=seed_date).delete()
            Report.objects.filter(submitted_at__date=seed_date).delete()
            AssignedTask.objects.filter(date=seed_date).delete()

        roles = ["Leader", "Mod", "Member"]
        statuses = ["approved", "declined", "pending"]
        ratings = [1, 2, 3, 4, 5]
        task_pool = [
            "Fix login bug",
            "Update landing page CTA",
            "Refactor auth flow",
            "Write unit tests for API",
            "Optimize image loading",
            "Design dashboard widget",
            "Improve accessibility",
            "Clean up CSS utilities",
            "Implement dark mode",
            "Document deployment steps",
        ]
        todo_pool = [
            "Review PRs",
            "Write standup notes",
            "Sync with design",
            "Plan sprint backlog",
            "Check error logs",
            "Test dark mode",
            "Update documentation",
            "Reply to user feedback",
            "Refactor old components",
            "Benchmark API endpoints",
        ]
        article_pool = [
            "In a world increasingly shaped by rapid technological change, organizations must continuously adapt their workflows to stay effective. Cross-functional collaboration, iterative development, and clear communication are critical to aligning teams and delivering value. The modern software development landscape requires teams to be agile, responsive, and innovative in their approach to problem-solving. Companies that embrace these principles are better positioned to navigate the complexities of today's digital ecosystem.",
            "Design systems and reusable components reduce inconsistency and accelerate feature work. By investing in shared UI primitives, teams avoid duplication and ensure accessibility and performance are built in from the start. A well-crafted design system serves as a single source of truth for both designers and developers, creating a common language that bridges the gap between concept and implementation. This approach not only streamlines the development process but also ensures a consistent user experience across all touchpoints of the product.",
            "Performance optimization is not a one-time effort but an ongoing practice. Profiling, caching, and monitoring help identify bottlenecks early, ensuring applications scale smoothly under real-world usage. The discipline of performance engineering encompasses a wide range of techniques, from front-end optimization strategies like lazy loading and code splitting to back-end improvements such as database query optimization and efficient algorithms. Regular performance audits and monitoring should be integrated into the development lifecycle to maintain high standards of user experience.",
            "Documentation is a multiplier. Well-written guides, ADRs, and examples reduce onboarding friction and empower developers to contribute confidently across the stack. Comprehensive documentation serves as the institutional memory of a project, preserving knowledge that might otherwise be lost as team members change over time. It's not enough to simply document what exists; effective documentation explains the reasoning behind architectural decisions, outlines best practices, and provides clear examples that developers can follow when extending or modifying the system.",
            "Security must be embedded throughout the lifecycle. Least privilege, secret management, and rigorous review processes mitigate risks and protect user trust. In an era of increasing cyber threats, security cannot be an afterthought or a separate phase in the development process. Instead, it must be woven into every aspect of software creation, from initial design to deployment and maintenance. This security-first mindset helps create resilient systems that can withstand evolving threats while maintaining the privacy and integrity of user data.",
            "Continuous feedback loops—through analytics, user research, and support channels—provide insights that steer product decisions and improve outcomes. The most successful products are those that evolve based on real user needs and behaviors. By establishing robust mechanisms for collecting and analyzing feedback, teams can identify pain points, discover opportunities for improvement, and validate new features before investing significant development resources. This data-driven approach to product development reduces the risk of building features that don't resonate with users.",
            "Agile methodologies have transformed how software teams approach development, emphasizing flexibility, collaboration, and customer satisfaction over rigid processes and extensive documentation. By breaking down large projects into smaller, manageable increments, teams can deliver value more quickly and adapt to changing requirements with minimal disruption. Regular retrospectives provide opportunities for continuous improvement, allowing teams to refine their processes and address emerging challenges proactively.",
            "The rise of microservices architecture has enabled organizations to build more scalable, maintainable systems by breaking down monolithic applications into smaller, independent services. This approach allows teams to develop, deploy, and scale individual components of a system without affecting the entire application. However, microservices also introduce complexity in terms of service discovery, data consistency, and distributed system management. Successful implementation requires careful planning, robust infrastructure, and a clear understanding of the trade-offs involved.",
            "Machine learning and artificial intelligence are increasingly being integrated into software products, enabling more intelligent, personalized user experiences. From recommendation systems to natural language processing, these technologies are opening new possibilities for innovation. However, implementing ML/AI features presents unique challenges, including the need for large datasets, specialized expertise, and ethical considerations around bias and transparency. Organizations must approach these technologies thoughtfully, ensuring they enhance rather than compromise the user experience.",
            "DevOps practices have revolutionized how software is built, tested, and deployed, bringing development and operations teams together to streamline the entire delivery pipeline. By automating repetitive tasks, implementing continuous integration and deployment, and fostering a culture of shared responsibility, organizations can release software more frequently and with greater confidence. Infrastructure as code, containerization, and cloud-native technologies have further accelerated this transformation, enabling teams to create more resilient, scalable systems.",
            "User experience design has evolved from a focus on aesthetics to a holistic discipline that encompasses usability, accessibility, and emotional engagement. Modern UX designers employ a range of research methods, from user interviews and surveys to usability testing and analytics, to gain deep insights into user needs and behaviors. These insights inform every aspect of the design process, from information architecture and interaction design to visual design and content strategy. The result is products that not only look good but also provide intuitive, satisfying experiences that keep users coming back.",
            "Technical debt is an inevitable reality in software development, arising from the need to balance short-term delivery with long-term maintainability. While some technical debt may be a strategic trade-off, unchecked accumulation can significantly impede future development efforts. Successful teams establish practices for identifying, measuring, and managing technical debt, allocating regular time for refactoring and addressing architectural issues. By treating technical debt as a first-class concern, organizations can maintain the health and sustainability of their codebase over time.",
            "The landscape of software development tools continues to evolve rapidly, with new frameworks, languages, and platforms emerging regularly. While these innovations offer exciting possibilities, teams must be selective about which technologies to adopt, considering factors such as community support, long-term viability, and alignment with business goals. A thoughtful technology strategy balances the benefits of cutting-edge tools with the stability of proven solutions, ensuring that choices enhance rather than complicate the development process.",
            "Remote and distributed work has become increasingly common in the software industry, presenting both opportunities and challenges for teams. While remote work offers flexibility and access to a broader talent pool, it requires intentional effort to maintain effective communication, collaboration, and team culture. Successful distributed teams leverage a combination of synchronous and asynchronous communication tools, establish clear expectations around availability and response times, and create opportunities for informal connection despite physical distance.",
            "Code quality is not merely about aesthetic preferences but has tangible impacts on maintainability, performance, and developer productivity. High-quality code is easier to understand, modify, and debug, reducing the time spent on maintenance and the likelihood of introducing bugs. Teams establish quality standards through style guides, code reviews, and automated testing, ensuring consistency across the codebase. Investing in code quality may slow initial development slightly, but pays significant dividends over the lifecycle of a product.",
            "API design has become a critical skill as software systems increasingly communicate through well-defined interfaces. A well-designed API is intuitive, consistent, and backward-compatible, making it easy for developers to integrate with and build upon. RESTful principles, GraphQL, and gRPC represent different approaches to API design, each with its own strengths and trade-offs. Regardless of the specific technology, effective API design requires careful consideration of data structures, error handling, authentication, and versioning strategies.",
            "Testing strategies have evolved beyond simple unit tests to encompass a wide range of approaches, including integration tests, end-to-end tests, and contract tests. Each type of test serves a specific purpose in the quality assurance process, from verifying individual components work correctly in isolation to ensuring the entire system functions as expected under real-world conditions. Test automation is essential for maintaining development velocity while ensuring quality, allowing teams to catch regressions early and deploy with confidence.",
            "Data privacy and compliance have become increasingly important considerations in software development, with regulations such as GDPR and CCPA imposing strict requirements on how organizations handle personal information. Building privacy into software from the ground up—through techniques such as data minimization, anonymization, and secure storage—helps organizations maintain compliance while building trust with users. A proactive approach to privacy not only avoids regulatory penalties but also demonstrates respect for user rights and can become a competitive differentiator.",
            "The concept of observability has gained prominence as systems become more complex and distributed. Beyond traditional monitoring, observability provides insights into a system's internal state through logs, metrics, and traces, enabling teams to understand and debug issues in production environments. By implementing comprehensive observability practices, organizations can reduce mean time to resolution (MTTR), proactively identify performance bottlenecks, and make data-driven decisions about system improvements.",
        ]

        users = []
        if target_user:
            uname = target_user
            u, created = User.objects.get_or_create(
                username=uname,
                defaults={
                    "email": f"{uname}@example.com",
                    "team_role": random.choice(roles),
                    "is_validate": True,
                },
            )
            if created:
                u.set_password("seedpass")
                u.save()
            users.append(u)
            self.stdout.write(self.style.WARNING(f"Targeting single user: {uname}"))
        else:
            for i in range(1, count + 1):
                uname = f"seeduser{i:02d}"
                u, created = User.objects.get_or_create(
                    username=uname,
                    defaults={
                        "email": f"{uname}@example.com",
                        "team_role": random.choice(roles),
                        "is_validate": True,
                    },
                )
                if created:
                    u.set_password("seedpass")
                    u.save()
                users.append(u)

        # Create tasks, reports, submissions
        for idx, u in enumerate(users, start=1):
            default_t_count = 20 + random.randint(0, 10)
            t_count = default_t_count
            if tasks_override and (target_user and u.username == target_user):
                try:
                    t_count = int(tasks_override)
                except Exception:
                    t_count = default_t_count
            tasks = []
            for _ in range(t_count):
                text = random.choice(task_pool)
                done = random.random() < 0.5
                tasks.append(
                    {
                        "id": f"t{random.randrange(10**8):08d}",
                        "text": text,
                        "done": done,
                    }
                )
                AssignedTask.objects.update_or_create(
                    user=u,
                    assigned_by=u,
                    text=text,
                    date=seed_date,
                    defaults={
                        "done": done,
                        "title": None,
                    },
                )

            todo_count = 6 + random.randint(0, 6)
            for _ in range(todo_count):
                ChecklistItem.objects.create(
                    user=u,
                    text=random.choice(todo_pool),
                    completed=random.random() < 0.5,
                )

            sections = ["Summary", "Achievements", "Challenges", "Next Steps"]
            note_parts = []
            for sec in sections:
                note_parts.append(f"{sec}:")
                for _ in range(5):
                    note_parts.append(f"- {random.choice(task_pool)}")
                note_parts.append("")
            note = "\n".join(note_parts)

            # Always generate a long article for the note section
            para_count = 10 + random.randint(0, 5)
            note = (
                note
                + "\n\n"
                + "\n\n".join(random.choice(article_pool) for _ in range(para_count))
            )

            if long_note and (not target_user or u.username == target_user):
                extra_lines = [f"- {random.choice(task_pool)}" for _ in range(50)]
                note = note + "\n" + "\n".join(extra_lines)

            status = random.choice(statuses)
            rating = random.choice(ratings) if status == "approved" else None

            report = Report.objects.create(
                user=u,
                tasks=json.dumps(tasks),
                note=note,
                note_type="text",
                status=status,
                rating=rating,
            )

            # Align submitted date to seed date by updating timestamp if needed
            # Note: auto_now_add sets the current time; override in a second step
            aware_dt = timezone.make_aware(
                datetime.combine(seed_date, timezone.localtime().time()),
                timezone.get_current_timezone(),
            )
            Report.objects.filter(pk=report.pk).update(submitted_at=aware_dt)

            Submission.objects.update_or_create(
                user=u,
                date=seed_date,
                defaults={
                    "report": note,
                    "rating": rating,
                },
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {len(users)} users, reports, and submissions for {seed_date}"
            )
        )
