import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/useProjectStore';

const AuditProjects = () => {
    const navigate = useNavigate();

    // [수정 완료] fetchProjects -> loadProjects 로 이름 변경!
    const { projects, loadProjects, loading } = useProjectStore();

    useEffect(() => {
        // [수정 완료] 여기서도 loadProjects 호출
        loadProjects();
    }, [loadProjects]);

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Audit Projects</h1>
                <button
                    onClick={() => navigate('/import')}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                    New Project
                </button>
            </div>

            {loading ? (
                <div>Loading projects...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.length === 0 ? (
                        <div className="col-span-full text-center text-muted-foreground py-10">
                            No projects found. Create one to get started!
                        </div>
                    ) : (
                        projects.map((project) => (
                            <div
                                key={project.id}
                                onClick={() => navigate(`/projects/${project.id}`)}
                                className="bg-card text-card-foreground p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                            >
                                <h3 className="text-xl font-semibold mb-2">{project.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                    Created: {project.created_at}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default AuditProjects;