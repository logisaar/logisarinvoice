import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    navigate(isAuthenticated ? "/admin" : "/login", { replace: true });
  }, [isAuthenticated, navigate]);

  return null;
};

export default Index;
