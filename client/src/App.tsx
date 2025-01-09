import { Switch, Route } from "wouter";
import Home from "@/pages/Home";
import OccupationSearch from "@/pages/OccupationSearch";
import { SOCSearchTest } from "@/components/SOCSearch/test";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

function App() {
  return (
    <Switch>
      <Route path="/" component={HomeWithBypass} />
      <Route path="/occupation-search" component={OccupationSearch} />
      <Route path="/test" component={SOCSearchTest} />
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