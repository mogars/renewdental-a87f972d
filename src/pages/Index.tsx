import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import { Users, FileText, Calendar, Shield } from "lucide-react";

const Index = () => {
  const features = [
    {
      icon: Users,
      title: "Patient Management",
      description: "Easily manage patient information, contact details, and insurance data.",
    },
    {
      icon: FileText,
      title: "Digital Charts",
      description: "Store and access patient chart records digitally for quick reference.",
    },
    {
      icon: Calendar,
      title: "Treatment History",
      description: "Track complete treatment history with dates, costs, and notes.",
    },
    {
      icon: Shield,
      title: "Secure Storage",
      description: "Your patient data is securely stored and easily accessible.",
    },
  ];

  return (
    <div className="min-h-screen gradient-hero">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="container py-20 lg:py-32">
          <div className="mx-auto max-w-3xl text-center animate-slide-up">
            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl text-balance">
              Modern Dental Practice Management
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Streamline your dental clinic operations with our intuitive patient chart management system. 
              Store, edit, and access patient records with ease.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link to="/patients">
                <Button size="lg" className="h-12 px-8 text-base">
                  View Patients
                </Button>
              </Link>
              <Link to="/patients">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                  Add New Patient
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container pb-20">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <Card
                key={feature.title}
                className="gradient-card border-border/50 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                    <feature.icon className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <h3 className="mb-2 font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-t border-border/50 bg-card/50">
          <div className="container py-16">
            <div className="grid gap-8 text-center md:grid-cols-3">
              <div className="animate-fade-in">
                <p className="font-display text-4xl font-bold text-primary">Easy</p>
                <p className="mt-2 text-muted-foreground">Patient Management</p>
              </div>
              <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
                <p className="font-display text-4xl font-bold text-primary">Secure</p>
                <p className="mt-2 text-muted-foreground">Data Storage</p>
              </div>
              <div className="animate-fade-in" style={{ animationDelay: "200ms" }}>
                <p className="font-display text-4xl font-bold text-primary">Fast</p>
                <p className="mt-2 text-muted-foreground">Record Access</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card">
        <div className="container py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 text-primary-foreground"
                >
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
                </svg>
              </div>
              <span className="font-display font-semibold text-foreground">DentaCare</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 DentaCare. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
