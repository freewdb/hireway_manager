import { Switch, Route } from "wouter";
import Home from "@/pages/Home";
import OccupationSearch from "@/pages/OccupationSearch";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

function App() {
  return (
    <Switch>
      <Route path="/" component={HomeWithBypass} />
      <Route path="/occupation-search" component={OccupationSearch} />
    </Switch>
  );
}

function HomeWithBypass() {
  return (
    <div>
      <Home />
      <div className="fixed bottom-4 right-4">
        <Link href="/occupation-search">
          <Button variant="secondary">
            Go to Occupation Search
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default App;